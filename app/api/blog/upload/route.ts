import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import readingTime from 'reading-time';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, description, content, image, author, tags, date, userId } = data;

    if (!title || !content || !userId) {
      return NextResponse.json({ error: 'Title, Content, and User ID are required' }, { status: 400 });
    }

    // Create a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const db = await getAdminDb();
    
    // Create a new document reference with an auto-generated ID
    const blogRef = db.collection('blogs').doc();
    const blogId = blogRef.id;

    // Status and Metatags
    const metatags = {
      title,
      description,
      image,
      date: date || new Date().toISOString(),
      tags: tags || [],
      readingTime: readingTime(content).text,
    };

    const isApproved = true; // Auto-approving all uploads for now as per simplicity? 
    // Actually the user said "author nam update karanne auto approve wenawa".
    // Since we don't have a lookup for "is the current user the author" for a BRAND NEW doc (they are by definition), we set it.

    // Main document update
    const mainDocData: any = {
      slug,
      authorId: userId,
      metatags,
      status: { views: 0, likes: 0 },
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now(),
    };

    await blogRef.set(mainDocData);

    // Content storage in sub-collection
    await blogRef.collection('contents').doc(userId).set({
      body: content,
      isApproved: true,
      editedTime: Timestamp.now(),
    });

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
