import { getCollection } from './mongodb';
import { ObjectId } from 'mongodb';
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
      try {
        const blogsCol = await getCollection('blogs');
        const blogs = await blogsCol.find().toArray();
        
        const accountsCol = await getCollection('accounts');

        const posts = await Promise.all(blogs.map(async (doc: any) => {
          const metatags = doc.metatags || {};
          const status = doc.status || {};
          const authorId = doc.authorId || '';

          let authorName = 'System Author';
          if (authorId) {
            const authorDoc = await accountsCol.findOne({ 
                $or: [{ _id: authorId }, { uid: authorId }] 
            });
            if (authorDoc) {
              authorName = authorDoc.name || 'Anonymous Author';
            }
          }

          return {
            blogId: doc._id.toString(),
            slug: doc.slug || doc._id.toString(),
            title: metatags.title || doc.title || 'Untitled',
            date: metatags.date || doc.date || new Date().toISOString(),
            description: metatags.description || doc.description || '',
            readingTime: metatags.readingTime || '1 min read',
            content: '',
            image: metatags.image || doc.image || '',
            authorId,
            authorName,
            tags: metatags.tags || doc.tags || [],
            views: status.views || 0,
            likes: status.likes || 0,
            isApproved: doc.isApproved !== false,
            editedTime: doc.lastUpdated ? new Date(doc.lastUpdated).toISOString() : new Date().toISOString(),
          } as BlogPost;
        }));

        return posts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } catch (error) {
        console.error("Error fetching blogs from MongoDB:", error);
        return [];
      }
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
          const blogsCol = await getCollection('blogs');
          const blog = await blogsCol.findOne({ slug });
          
          if (!blog) return null;
          
          const blogId = blog._id.toString();
          const metatags = blog.metatags || {};
          const status = blog.status || {};

          // MongoDB uses top-level 'contents' collection with blogId reference
          const contentsCol = await getCollection('contents');
          const contents = await contentsCol.find({ 
              blogId: blogId, 
              isApproved: true 
          }).sort({ editedTime: -1 }).limit(1).toArray();

          let body = '';
          if (contents.length > 0) {
            body = contents[0].body || '';
          } else {
            // Fallback to searching by string blogId just in case
            const fallbackContents = await contentsCol.find({ blogId }).sort({ editedTime: -1 }).limit(1).toArray();
            if (fallbackContents.length > 0) {
              body = fallbackContents[0].body || '';
            } else {
              body = blog.content || '';
            }
          }

          if (!body) return null;

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
            title: metatags.title || blog.title || 'Untitled',
            date: metatags.date || blog.date || new Date().toISOString(),
            description: metatags.description || blog.description || '',
            readingTime: metatags.readingTime || readingTime(body).text,
            content: contentHtml,
            image: metatags.image || blog.image || '',
            authorId: blog.authorId || '',
            tags: metatags.tags || blog.tags || [],
            views: status.views || 0,
            likes: status.likes || 0,
            isApproved: true,
            editedTime: blog.lastUpdated ? new Date(blog.lastUpdated).toISOString() : new Date().toISOString(),
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
