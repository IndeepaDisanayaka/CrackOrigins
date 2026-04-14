import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, description, content, image, author, tags, date } = data;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and Content are required' }, { status: 400 });
    }

    // Create a slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const blogDir = path.join(process.cwd(), 'content', 'blog');
    
    // Ensure directory exists
    if (!fs.existsSync(blogDir)) {
      fs.mkdirSync(blogDir, { recursive: true });
    }

    // Prepare frontmatter
    const frontmatter = `---
title: "${title}"
date: "${date}"
description: "${description}"
image: "${image}"
author: "${author}"
tags: ${JSON.stringify(tags)}
---

${content}`;

    const filePath = path.join(blogDir, `${slug}.md`);

    // Check if exists already to avoid overwriting unless intended (simple version: always write)
    fs.writeFileSync(filePath, frontmatter, 'utf8');

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Error uploading blog post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
