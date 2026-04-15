import React, { Suspense } from 'react';
import { Metadata } from 'next';
import HomeContent from '../components/HomeContent';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const referralId = params.ref as string;

  const title = referralId 
    ? `Join the Tribe | Crack Origins Affiliate Program` 
    : 'Crack Origins | Premium Indie Game Development & Chronicles';
    
  const description = referralId 
    ? `Your comrade invited you to join the quest. Track your progress, unlock rewards, and explore high-performance chronicles.`
    : 'Welcome to Crack Origins, the ultimate hub for indie game development, chronicles, and community-driven projects.';

  return {
    title,
    description,
    keywords: [
      'Crack Origins', 'Indie Games', 'Game Development', 'Steam Deals', 
      'Free Game Keys', 'Gaming Community', 'Premium Gaming Chronicles',
      'Affiliate Program', 'Unity Developers', 'Unreal Engine Developers'
    ],
    authors: [{ name: 'Crack Origins Team' }],
    openGraph: {
      title,
      description,
      url: 'https://crackorigins.com' + (referralId ? `?ref=${referralId}` : ''),
      siteName: 'Crack Origins',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Crack Origins - A New Page in History' }],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
      creator: '@crackorigins',
    },
    alternates: {
      canonical: 'https://crackorigins.com' + (referralId ? `?ref=${referralId}` : ''),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Crack Origins',
    url: 'https://crackorigins.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://crackorigins.com/blog?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f', color: '#fff' }}>Loading Crack Origins...</div>}>
        <HomeContent />
      </Suspense>
    </>
  );
}
