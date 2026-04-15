import React from 'react';
import { Metadata } from 'next';
import TermsContent from './TermsContent';

export const metadata: Metadata = {
  title: 'Privacy Policy & Terms of Service',
  description: 'Review the official Privacy Policy and Terms of Service for Crack Origins. Understand how we manage data protection, user responsibilities, and our digital product policies.',
  openGraph: {
    title: 'Privacy Policy & Terms of Service | Crack Origins',
    description: 'Operational protocols and legal framework for the Crack Origins studio.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://crackorigins.com/terms',
  },
};

export default function TermsPage() {
  return <TermsContent />;
}
