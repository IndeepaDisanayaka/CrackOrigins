import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import HeaderWrapper from '@/components/blog/HeaderWrapper';
import Footer from '@/components/layout/Footer';
import SubHeader from '@/components/layout/SubHeader';
import { getGameUpdate } from '@/lib/admin-actions';
import { Metadata } from 'next';
import styles from '@/app/page.module.css';
import blogPostStyles from '@/app/blog/[slug]/blog-post.module.css';
import { remark } from 'remark';
import html from 'remark-html';

interface Props {
  params: Promise<{ slug: string; updateId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, updateId } = await params;
  const res = await getGameUpdate(slug, updateId);

  if (!res.success || !res.update) return { title: 'Update Not Found' };

  const update: any = res.update;
  return {
    title: `${update.title} - ${update.gameTitle} Update | Crack Origins`,
    description: update.description,
    openGraph: {
      title: update.title,
      description: update.description,
      type: 'article',
      images: update.image ? [{ url: update.image }] : [],
    }
  };
}

export default async function GameUpdatePage({ params }: Props) {
  const { slug, updateId } = await params;
  const res = await getGameUpdate(slug, updateId);

  if (!res.success || !res.update) {
    notFound();
  }

  const update: any = res.update;

  // Process markdown
  const processedContent = await remark()
    .use(html)
    .process(update.body || '');
  const contentHtml = processedContent.toString();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: update.title,
    description: update.description,
    image: update.image,
    datePublished: update.date,
    author: {
      '@type': 'Organization',
      name: update.author || 'Crack Origins',
    },
  };

  return (
    <>
      <div className={styles.backgroundAnimation}></div>

      <React.Suspense fallback={<div className="h-20 bg-black/20 animate-pulse" />}>
        <HeaderWrapper />
      </React.Suspense>
      
      <SubHeader />

      <main className={styles.main}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <article className={blogPostStyles.blogPostWrapper}>
          <div className={blogPostStyles.topNavigation}>
            <Link href={`/games/${slug}`} className="btnOutline" style={{ marginBottom: '2rem', padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
              <ArrowLeft size={16} /> BACK TO {update.gameTitle.toUpperCase()}
            </Link>
          </div>
          
          <header className={blogPostStyles.postHeader}>
            <div className={blogPostStyles.postMeta}>
              TACTICAL UPDATE • {formatDate(new Date(update.date), 'dd MMMM yyyy')}
            </div>

            <h1 className={blogPostStyles.postTitle}>
              {update.title}
            </h1>

            <div className={blogPostStyles.tagContainer}>
              {update.tags?.map((tag: string) => (
                <span key={tag} className={blogPostStyles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </header>

          {update.image && (
            <div className={blogPostStyles.bannerContainer} style={{ position: 'relative', width: '100%', height: '400px' }}>
              <Image
                src={update.image}
                alt={update.title}
                fill
                priority
                quality={75}
                className={blogPostStyles.bannerImage}
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <div className={blogPostStyles.mainContent}>
            <div 
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            <footer className={blogPostStyles.postFooter}>
               <Link 
                href={`/games/${slug}`} 
                className="btnOutline"
              >
                <ArrowLeft size={16} />
                RETURN TO PROJECT HUB
              </Link>
            </footer>
          </div>
        </article>

        <Footer />
      </main>
    </>
  );
}
