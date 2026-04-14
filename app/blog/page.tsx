import React from 'react';
import Link from 'next/link';
import { formatDate } from 'date-fns';
import { ChevronRight, MessageCircle, SendHorizontal, MessageSquare, Share2 } from 'lucide-react';
import HeaderWrapper from '@/components/blog/HeaderWrapper';
import Footer from '@/components/layout/Footer';
import SubHeader from '@/components/layout/SubHeader';
import { getBlogPosts } from '@/lib/blog';
import { Metadata } from 'next';
import styles from '../page.module.css';
import blogStyles from './blog.module.css';

export const metadata: Metadata = {
  title: 'Blog | Crack Origins - Gaming News & Developer Insights',
  description: 'Stay updated with the latest gaming news, development updates, and technical insights from the Crack Origins team.',
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  
  // Sort posts by date descending (latest first)
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <div className={styles.backgroundAnimation}></div>
      
      <main className={styles.main}>
        <React.Suspense fallback={<div className="h-20 bg-black/20 animate-pulse" />}>
          <HeaderWrapper />
        </React.Suspense>
        
        <SubHeader />

        <div className={blogStyles.blogContainer}>
          {/* Section Header - Styled like Home Sections */}
          <div className={blogStyles.blogHeader}>
             <span className="sectionLabel">Classified Database</span>
             <h2 className={blogStyles.blogTitle}>Dispatch & <span>Chronicles</span></h2>
          </div>

          {sortedPosts.length === 0 ? (
            <div className="text-center py-40 border border-dashed border-[var(--outline-color)] opacity-40">
              <p className="text-gray-500 font-mono italic">No archived transmissions found.</p>
            </div>
          ) : (
            <div className={blogStyles.blogGrid}>
              {sortedPosts.map((post) => (
                <div key={post.slug}>
                  <div className={blogStyles.card}>
                    <Link href={`/blog/${post.slug}`} className="block">
                      {/* Image Header */}
                      <div className={blogStyles.imageWrapper}>
                        <img
                          src={post.image || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80'}
                          alt={post.title}
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
                      </div>
                    </Link>

                    {/* Moved Action & Social Row to separate div to handle link correctly */}
                    <div className={blogStyles.cardBody} style={{ paddingTop: 0 }}>
                       <div className={blogStyles.cardFooter}>
                          <Link href={`/blog/${post.slug}`} className={blogStyles.readBtn}>
                             Read Article
                          </Link>
                          
                          <div className={blogStyles.socialIcons}>
                             <MessageSquare size={14} className={blogStyles.socialIcon} />
                             <SendHorizontal size={14} className={blogStyles.socialIcon} />
                             <MessageCircle size={14} className={blogStyles.socialIcon} />
                             <Share2 size={14} className={blogStyles.socialIcon} />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Footer />
      </main>
    </>
  );
}
