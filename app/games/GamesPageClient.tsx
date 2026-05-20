'use client';

import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useState } from 'react';

export default function GamesPageClient() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
    </>
  );
}
