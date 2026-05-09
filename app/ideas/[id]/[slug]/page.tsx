import React from 'react';
import IdeaDetailsClient from './IdeaDetailsClient';
import { Metadata } from 'next';
import { getAdminDb } from '@/lib/firebase-admin';

interface Props {
  params: Promise<{ id: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const adminDb = await getAdminDb();
    const docSnap = await adminDb.collection('ideas').doc(id).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return {
        title: `${data?.title} | Crack Origins Ideas`,
        description: data?.description,
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
