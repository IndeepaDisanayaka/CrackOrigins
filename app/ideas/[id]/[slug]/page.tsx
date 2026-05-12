import React from 'react';
import IdeaDetailsClient from './IdeaDetailsClient';
import { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebase-admin';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, slug } = await params;
  
  try {
    const adminDb = await getAdminDb();
    const docSnap = await adminDb.collection('ideas').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const title = `${data?.title} | Crack Origins Ideas`;
      const description = data?.description || 'Explore this creative idea on Crack Origins.';
      const imageUrl = data?.image || '/og-image.png';

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
  return <IdeaDetailsClient id={id} slug={slug} />;
}
