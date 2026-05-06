import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import readingTime from 'reading-time';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, description, content, image, author, tags, date, userId, type, gameId } = data;

    if (!title || !content || !userId) {
      return NextResponse.json({ error: 'Title, Content, and User ID are required' }, { status: 400 });
    }

    const db = await getAdminDb();
    
    if (type === 'game-update') {
      if (!gameId) return NextResponse.json({ error: 'Game ID is required for game updates' }, { status: 400 });
      
      // Validation for game update: version and image urls
      const hasVersion = content.toLowerCase().includes('version') || content.toLowerCase().includes('v1.') || content.toLowerCase().includes('v0.');
      if (!hasVersion) {
        return NextResponse.json({ error: 'Game updates must include version info (e.g. v1.0.4).' }, { status: 400 });
      }

      // Save to game updates subcollection
      const gameRef = db.collection('games').doc(gameId);
      const updateRef = gameRef.collection('updates').doc();
      
      await updateRef.set({
        title,
        description,
        body: content,
        image,
        author,
        tags: tags || [],
        date: date || new Date().toISOString(),
        authorId: userId,
        createdAt: Timestamp.now()
      });

      return NextResponse.json({ success: true, type: 'game-update', id: updateRef.id });
    }

    // Normal Blog Logic
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const blogRef = db.collection('blogs').doc();
    const blogId = blogRef.id;

    const metatags = {
      title,
      description,
      image,
      date: date || new Date().toISOString(),
      tags: tags || [],
      readingTime: readingTime(content).text,
    };

    const mainDocData: any = {
      slug,
      authorId: userId,
      metatags,
      status: { views: 0, likes: 0 },
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
    };

    await blogRef.set(mainDocData);

    await blogRef.collection('contents').doc(userId).set({
      body: content,
      isApproved: true,
      editedTime: Timestamp.now(),
    });

    try {
      const { revalidatePath } = await import('next/cache');
      revalidatePath('/blogs');
      revalidatePath(`/blogs/${slug}`);
    } catch (e) {
      console.error('Revalidation failed:', e);
    }

    return NextResponse.json({ 
      success: true, 
      slug,
      blogId
    });
  } catch (error) {
    console.error('Error uploading blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
