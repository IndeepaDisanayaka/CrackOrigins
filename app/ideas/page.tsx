import React from 'react';
import IdeasClient from './IdeasClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Hub | Crack Origins Lore & Chronicles',
  description: 'Explore the ultimate sanctuary for storytellers. Read exclusive backstories, share original fiction, and collaborate on world-building.',
  openGraph: {
    title: 'Creator Hub | Crack Origins Lore & Chronicles',
    description: 'The sanctuary for game developers and storytellers at Crack Origins.',
    images: [{ url: '/og-image.png' }],
  },
};

export default function IdeasPage() {
  return <IdeasClient />;
}
