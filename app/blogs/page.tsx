import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDate } from 'date-fns';
import { getBlogPosts } from '@/lib/blog';
import { Metadata } from 'next';
import styles from '../page.module.css';
import blogStyles from './blog.module.css';
import BlogCardInteractions from '@/components/blog/BlogCardInteractions';
import { Eye, Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dispatch Archive | Crack Origins Chronicles',
  description: 'Stay updated with the latest gaming news, development updates, and technical insights from the Crack Origins team.',
  openGraph: {
    title: 'Dispatch Archive | Crack Origins Chronicles',
    description: 'Archived transmissions and development chronicles from the Crack Origins studio.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
    twitter: {
      card: 'summary_large_image',
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: 'https://crackorigins.com/blogs',
    }
  };

export const revalidate = 60; // Revalidate every 60 seconds

export default async function BlogPage() {
  const posts = await getBlogPosts();
  
  // Sort posts by date descending (latest first)
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <main className={styles.main}>

        <div className={blogStyles.blogContainer}>
          {/* Section Header - Styled like Home Sections */}
          <div className={blogStyles.blogHeader}>
            <div className={blogStyles.headerGrid}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={blogStyles.gridLine} />
              ))}
            </div>
            <span className="sectionLabel">Classified Database</span>
            <h1 className={blogStyles.blogTitle}>Dispatch & <span>Chronicles</span></h1>
          </div>

          {sortedPosts.length === 0 ? (
            <div className="text-center py-40 border border-dashed border-[var(--outline-color)] opacity-40">
              <p className="text-gray-500 font-mono italic">No archived transmissions found.</p>
            </div>
          ) : (
            <div className={blogStyles.blogGrid}>
              {sortedPosts.map((post:any) => (
                <div key={post._id || post.blogId}>
                  <div className={blogStyles.card}>
                    <Link href={`/blogs/${post.slug}`} className="block">
                      {/* Image Header */}
                      <div className={blogStyles.imageWrapper}>
                        <Image
                          src={post.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
                          alt={post.title}
                          width={600}
                          height={400}
                          quality={75}
                          className={blogStyles.cardImage}
                        />
                        <div className={blogStyles.postBadge}>
                           CLASSIFIED
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className={blogStyles.cardBody}>
                        <div className={blogStyles.metaRow}>
                          <span className={blogStyles.date}>{formatDate(new Date(post.date), 'dd MMM yyyy')}</span>
                          <div className={blogStyles.divider} />
                          <span>{post.readingTime}</span>
                        </div>

                        <h2 className={blogStyles.postTitle}>
                          {post.title}
                        </h2>

                        <p className={blogStyles.description}>
                          {post.description}
                        </p>

                        <div className={blogStyles.statsRow}>
                            <div className={blogStyles.stat}>
                                <Eye size={12} /> {post.views}
                            </div>
                            <div className={blogStyles.stat}>
                                <Heart size={12} /> {post.likes}
                            </div>
                        </div>
                      </div>
                    </Link>

                    {/* Moved Action & Social Row to separate div to handle link correctly */}
                    <div className={blogStyles.cardBody} style={{ paddingTop: 0 }}>
                       <div className={blogStyles.cardFooter}>
                          <Link href={`/blogs/${post.slug}`} className={blogStyles.readBtn}>
                             Read Article
                          </Link>
                          
                          <div className={blogStyles.socialIcons}>
                             <BlogCardInteractions 
                               blogId={post.blogId} 
                               slug={post.slug} 
                               title={post.title} 
                             />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
