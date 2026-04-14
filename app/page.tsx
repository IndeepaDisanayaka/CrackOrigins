import React, { Suspense } from 'react';
import { Metadata } from 'next';
import HomeContent from '../components/HomeContent';

export const metadata: Metadata = {
  title: 'Crack Origins | Premium Indie Game Development & Chronicles',
  description: 'Welcome to Crack Origins, the ultimate hub for indie game development, chronicles, and community-driven projects. Explore our latest creations and gaming insights.',
  openGraph: {
    title: 'Crack Origins | Premium Indie Game Development',
    description: 'The ultimate hub for indie game dev, chronicles, and community projects.',
    url: 'https://crackorigins.com',
    siteName: 'Crack Origins',
    images: [{ url: '/hero-og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crack Origins | Indie Game Development',
    description: 'Explore the future of indie gaming and chronicles with Crack Origins.',
    images: ['/hero-og-image.png'],
  },
  alternates: {
    canonical: 'https://crackorigins.com',
  },
};

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
