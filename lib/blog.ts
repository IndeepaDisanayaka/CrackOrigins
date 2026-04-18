import { getAdminDb } from './firebase-admin';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import readingTime from 'reading-time';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export interface BlogPost {
  blogId: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  readingTime: string;
  content: string;
  image?: string;
  authorId: string;
  authorName?: string;
  tags?: string[];
  views: number;
  likes: number;
  isApproved: boolean;
  editedTime: string;
}

export const getBlogPosts = cache(
  unstable_cache(
    async (): Promise<BlogPost[]> => {
      const db = await getAdminDb();
      
      const blogsSnapshot = await db.collection('blogs').get();
      
      const posts = await Promise.all(blogsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        const metatags = data.metatags || {};
        const status = data.status || {};
        const authorId = data.authorId || '';

        let authorName = 'System Author';
        if (authorId) {
          const authorDoc = await db.collection('accounts').doc(authorId).get();
          if (authorDoc.exists) {
            authorName = authorDoc.data()?.name || 'Anonymous Author';
          }
        }

        return {
          blogId: doc.id,
          slug: data.slug || doc.id,
          title: metatags.title || 'Untitled',
          date: metatags.date || new Date().toISOString(),
          description: metatags.description || '',
          readingTime: metatags.readingTime || '1 min read',
          content: '',
          image: metatags.image || '',
          authorId,
          authorName,
          tags: metatags.tags || [],
          views: status.views || 0,
          likes: status.likes || 0,
          isApproved: true,
          editedTime: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
        } as BlogPost;
      }));

      return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    ['blog-posts-cache'],
    { revalidate: 60, tags: ['blogs'] }
  )
);

export const getBlogPostBySlug = cache(
  async (slug: string): Promise<BlogPost | null> => {
    return unstable_cache(
      async () => {
        try {
          const db = await getAdminDb();
          
          const blogQuery = await db.collection('blogs').where('slug', '==', slug).limit(1).get();
          
          if (blogQuery.empty) return null;
          
          const blogDoc = blogQuery.docs[0];
          const data = blogDoc.data();
          const blogId = blogDoc.id;
          const metatags = data.metatags || {};
          const status = data.status || {};

          const contentsSnapshot = await db
            .collection('blogs')
            .doc(blogId)
            .collection('contents')
            .where('isApproved', '==', true)
            .get();

          if (contentsSnapshot.empty) return null;

          const contentDoc = contentsSnapshot.docs.sort((a, b) => 
            (b.data().editedTime?.toMillis() || 0) - (a.data().editedTime?.toMillis() || 0)
          )[0];
          
          const contentData = contentDoc.data();
          const body = contentData.body || '';

          const processedContent = await unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkRehype)
            .use(rehypeSlug)
            .use(rehypeAutolinkHeadings, {
              behavior: 'wrap',
            })
            .use(rehypeHighlight)
            .use(rehypeStringify)
            .process(body);

          const contentHtml = processedContent.toString();

          return {
            blogId,
            slug,
            title: metatags.title || 'Untitled',
            date: metatags.date || new Date().toISOString(),
            description: metatags.description || '',
            readingTime: metatags.readingTime || readingTime(body).text,
            content: contentHtml,
            image: metatags.image || '',
            authorId: data.authorId || '',
            tags: metatags.tags || [],
            views: status.views || 0,
            likes: status.likes || 0,
            isApproved: true,
            editedTime: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : new Date().toISOString(),
          } as BlogPost;
        } catch (error) {
          console.error(`Error loading blog post ${slug}:`, error);
          return null;
        }
      },
      [`blog-post-${slug}`],
      { revalidate: 60, tags: [`blog-${slug}`] }
    )();
  }
);
