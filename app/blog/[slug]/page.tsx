import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import HeaderWrapper from '@/components/blog/HeaderWrapper';
import Footer from '@/components/layout/Footer';
import SubHeader from '@/components/layout/SubHeader';
import { getBlogPostBySlug, getBlogPosts } from '@/lib/blog';
import { Metadata } from 'next';
import styles from '../../page.module.css';
import blogPostStyles from './blog-post.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

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
      authors: [post.author || 'Crack Origins'],
      images: post.image ? [{ url: post.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [],
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
    author: {
      '@type': 'Organization',
      name: post.author || 'Crack Origins',
    },
  };

  return (
    <>
      <div className={styles.backgroundAnimation}></div>

      <main className={styles.main}>
        {/* JSON-LD for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <React.Suspense fallback={<div className="h-20 bg-black/20 animate-pulse" />}>
          <HeaderWrapper />
        </React.Suspense>
        
        <SubHeader />

        <article className={blogPostStyles.blogPostWrapper}>
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
            <div className={blogPostStyles.bannerContainer}>
              <img
                src={post.image}
                alt={post.title}
                className={blogPostStyles.bannerImage}
              />
            </div>
          )}

          {/* Content Wrapper */}
          <div className={blogPostStyles.mainContent}>
            {/* Markdown Content */}
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Simple Footer Dispatch */}
            <footer className={blogPostStyles.postFooter}>
               <Link 
                href="/blog" 
                className="btnOutline"
              >
                <ArrowLeft size={16} />
                BACK TO DISPATCH ARCHIVE
              </Link>
            </footer>
          </div>
        </article>

        <Footer />
      </main>
    </>
  );
}
