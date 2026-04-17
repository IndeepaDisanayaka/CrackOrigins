import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import OffersContent from '@/components/OffersContent';

export const metadata: Metadata = {
  title: 'All Steam Game Offers & Deals | Crack Origins',
  description: 'Browse all exclusive Steam game deals and massive discounts at Crack Origins. Limited time offers, giveaways, and top tier games at unbeatable prices.',
  keywords: ['steam games', 'game deals', 'cheap games', 'game giveaways', 'steampowered', 'pc games', 'crack origins offers'],
  openGraph: {
    title: 'All Steam Game Offers & Deals | Crack Origins',
    description: 'Browse all exclusive Steam game deals and massive discounts at Crack Origins. Limited time offers on top tier games.',
    type: 'website',
  },
};

export default function OffersPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f', color: '#fff' }}>Loading Offers...</div>}>
      <OffersContent />
    </Suspense>
  );
}

