import React from 'react';
import IdeaDetailsClient from './IdeaDetailsClient';
import { Metadata } from 'next';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { getIdeaById, getIdeaSnapshot } from '@/lib/idea-actions';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  
  try {
    const res = await getIdeaById(id);
    if (res.success && res.idea) {
      const data = res.idea;
      const title = `${data?.title} | Crack Origins Ideas`;
      const description = data?.description || 'Explore this creative idea on Crack Origins.';
      const imageUrl = getAbsoluteImageUrl(data?.image);

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          type: 'article',
          url: `https://crackorigins.com/ideas/${id}/${slug}`,
          images: [{ url: imageUrl }],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
        },
        alternates: {
          canonical: `https://crackorigins.com/ideas/${id}/${slug}`,
        },
      };
    }
  } catch (e) {
    console.error("Metadata fetch error:", e);
  }

  return {
    title: 'Idea Details | Crack Origins',
  };
}

export default async function IdeaDetailsPage({ params }: Props) {
  const { id, slug } = await params;
  
  // Parallel fetch on server
  const [ideaRes, snapshotRes] = await Promise.all([
    getIdeaById(id),
    getIdeaSnapshot(id)
  ]);

  if (!ideaRes.success || !ideaRes.idea) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <h1 style={{ color: 'var(--foreground)' }}>Chronicle Not Found</h1>
        <p style={{ color: 'var(--text-muted)' }}>The requested classified transmission could not be retrieved.</p>
      </div>
    );
  }

  return (
    <IdeaDetailsClient 
      id={id} 
      slug={slug} 
      initialIdea={ideaRes.idea}
      initialSnapshot={snapshotRes.success ? snapshotRes.snapshot : null}
    />
  );
}
