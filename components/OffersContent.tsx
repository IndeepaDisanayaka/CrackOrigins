'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import Footer from '@/components/layout/Footer';
import SteamMarketplace from '@/components/sections/SteamMarketplace';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useModals } from '@/lib/contexts/ModalContext';
import styles from '@/app/page.module.css';
import LiveCursors from '@/components/LiveCursors';

const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

export default function OffersContent() {
  const { login } = useAuth();
  const { isAuthModalOpen, setIsAuthModalOpen } = useModals();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();

  const handleLogin = async () => {
    const refId = searchParams?.get('ref');
    const res = await login(refId);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
  };

  return (
    <>
      <LiveCursors />
      <div className={styles.backgroundAnimation}></div>
      <main className={styles.main}>
        <Header 
          isMobileMenuOpen={isMobileMenuOpen} 
          setIsMobileMenuOpen={setIsMobileMenuOpen} 
        />

        <MobileNav 
          isOpen={isMobileMenuOpen} 
          setIsOpen={setIsMobileMenuOpen} 
        />

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={handleLogin} 
        />

        <div style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '40px', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <SteamMarketplace showAll={true} />
        </div>

        <Footer />
      </main>
    </>
  );
}
