import React from 'react';
import IdeaDetailsClient from './IdeaDetailsClient';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAbsoluteImageUrl } from '@/lib/utils';
import { getIdeaBySlug, getIdeaSnapshot } from '@/lib/idea-actions';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const res = await getIdeaBySlug(slug);
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
          url: `https://crackorigins.com/ideas/${slug}`,
          images: [{ url: imageUrl }],
        },
        twitter: {
          card: 'summary_large_image',
          title,
          description,
          images: [imageUrl],
        },
        alternates: {
          canonical: `https://crackorigins.com/ideas/${slug}`,
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
  const { slug } = await params;
  
  const ideaRes = await getIdeaBySlug(slug);

  if (!ideaRes.success || !ideaRes.idea) {
    notFound();
  }

  const ideaId = ideaRes.idea._id;
  const snapshotRes = await getIdeaSnapshot(ideaId);

  return (
    <IdeaDetailsClient 
      id={ideaId}
      slug={slug} 
      initialIdea={ideaRes.idea}
      initialSnapshot={snapshotRes.success ? snapshotRes.snapshot : null}
    />
  );
}
