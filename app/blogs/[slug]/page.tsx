import React, { Suspense } from 'react';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/blog';
import BlogInteractions from '@/components/blog/BlogInteractions';
import { Metadata } from 'next';
import styles from '../../page.module.css';
import blogPostStyles from './blog-post.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | Crack Origins Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.editedTime || post.date,
      authors: [post.authorId || 'Crack Origins'],
      images: post.image ? [{ url: post.image }] : [],
    },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.description,
        images: post.image ? [post.image] : [],
      },
      alternates: {
        canonical: `https://crackorigins.com/blogs/${slug}`,
      },
    };
  }

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    image: post.image,
    datePublished: post.date,
    dateModified: post.editedTime || post.date,
    author: {
      '@type': 'Organization',
      name: post.authorId || 'Crack Origins',
    },
  };

  return (
    <>
      <main className={styles.main}>
        {/* JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <article className={blogPostStyles.blogPostWrapper}>
          <div className={blogPostStyles.topNavigation}>
            <Link href="/blogs" className="btnOutline" style={{ marginBottom: '2rem', padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
              <ArrowLeft size={16} /> BACK TO DISPATCH
            </Link>
          </div>
          
          {/* Main Header */}
          <header className={blogPostStyles.postHeader}>
            <div className={blogPostStyles.postMeta}>
              {formatDate(new Date(post.date), 'dd MMMM yyyy')} • {post.readingTime}
            </div>

            <h1 className={blogPostStyles.postTitle}>
              {post.title}
            </h1>

            <div className={blogPostStyles.tagContainer}>
              {post.tags?.map((tag) => (
                <span key={tag} className={blogPostStyles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </header>

          {/* Full Width Banner */}
          {post.image && (
            <div className={blogPostStyles.bannerContainer} style={{ position: 'relative', width: '100%', height: '400px' }}>
              <Image
                src={post.image}
                alt={post.title}
                fill
                priority
                quality={75}
                className={blogPostStyles.bannerImage}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Content Wrapper */}
          <div className={blogPostStyles.mainContent}>
            <Suspense fallback={<div className="h-20 bg-black/10 animate-pulse rounded-lg" />}>
              <BlogInteractions 
                blogId={post.blogId}
                slug={slug} 
                initialViews={post.views} 
                initialLikes={post.likes} 
              />
            </Suspense>

            {/* Markdown Content */}
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            <Suspense fallback={<div className="h-20 bg-black/10 animate-pulse rounded-lg" />}>
              <BlogInteractions 
                blogId={post.blogId}
                slug={slug} 
                initialViews={post.views} 
                initialLikes={post.likes} 
              />
            </Suspense>

            {/* Simple Footer Dispatch */}
            <footer className={blogPostStyles.postFooter}>
               <Link 
                href="/blogs" 
                className="btnOutline"
              >
                <ArrowLeft size={16} />
                BACK TO DISPATCH ARCHIVE
              </Link>
            </footer>
          </div>
        </article>
      </main>
    </>
  );
}
