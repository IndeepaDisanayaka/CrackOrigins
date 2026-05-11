import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import readingTime from 'reading-time';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, description, content, image, author, tags, date, userId, type, gameId } = data;

    if (!title || !content || !userId) {
      return NextResponse.json({ error: 'Title, Content, and User ID are required' }, { status: 400 });
    }

    const db = await getMongoDb();
    
    if (type === 'game-update') {
      if (!gameId) return NextResponse.json({ error: 'Game ID is required for game updates' }, { status: 400 });
      
      const hasVersion = content.toLowerCase().includes('version') || content.toLowerCase().includes('v1.') || content.toLowerCase().includes('v0.');
      if (!hasVersion) {
        return NextResponse.json({ error: 'Game updates must include version info (e.g. v1.0.4).' }, { status: 400 });
      }

      const updateData = {
        title,
        description,
        body: content,
        image,
        author,
        tags: tags || [],
        date: date || new Date().toISOString(),
        authorId: userId,
        createdAt: new Date(),
        gameId: new ObjectId(gameId)
      };
      
      const result = await db.collection('game_updates').insertOne(updateData);

      return NextResponse.json({ success: true, type: 'game-update', id: result.insertedId });
    }

    // Normal Blog Logic
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const metatags = {
      title,
      description,
      image,
      date: date || new Date().toISOString(),
      tags: tags || [],
      readingTime: readingTime(content).text,
    };

    const blogId = new ObjectId();
    
    const blogDoc = {
      _id: blogId,
      slug,
      authorId: userId,
      metatags,
      status: { views: 0, likes: 0 },
      isApproved: true,
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    const contentDoc = {
      blogId: blogId.toString(),
      body: content,
      isApproved: true,
      editedTime: new Date()
    };

    await Promise.all([
      db.collection('blogs').insertOne(blogDoc),
      db.collection('contents').insertOne(contentDoc)
    ]);

    try {
      const { revalidatePath, revalidateTag } = await import('next/cache');
      revalidatePath('/blog');
      revalidatePath(`/blog/${slug}`);
      revalidatePath('/blogs');
      revalidateTag('blogs', 'max');
    } catch (e) {
      console.error('Revalidation failed:', e);
    }

    return NextResponse.json({ 
      success: true, 
      slug,
      blogId: blogId.toString()
    });
  } catch (error) {
    console.error('Error uploading blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
