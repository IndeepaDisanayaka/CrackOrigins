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
import extraStyles from '@/components/ExtraSections.module.css';
import LiveCursors from '@/components/LiveCursors';

const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('./admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('./admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('./admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('./admin/DispatchModal'), { ssr: false });

export default function OffersContent() {
  const { user, isAdmin, login } = useAuth();
  const { 
    isAuthModalOpen, setIsAuthModalOpen,
    isAdminModalOpen, setIsAdminModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen,
    isListGameOpen, setIsListGameOpen,
    isDispatchModalOpen, setIsDispatchModalOpen
  } = useModals();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const refId = searchParams?.get('ref');
    const res = await login(type, credentials, refId);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  return (
    <>
      <LiveCursors />
      <div className={styles.backgroundAnimation}></div>
      <Header 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />

      <MobileNav 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />

      <main className={styles.main}>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={handleLogin} 
        />

        <CouponModal 
          isOpen={isCouponModalOpen} 
          onClose={() => setIsCouponModalOpen(false)} 
        />

        <AddOfferModal 
          isOpen={isAddOfferModalOpen} 
          onClose={() => setIsAddOfferModalOpen(false)} 
        />
        
        <ListGameModal 
          isOpen={isListGameOpen} 
          onClose={() => setIsListGameOpen(false)} 
        />

        <DispatchModal
          isOpen={isDispatchModalOpen}
          onClose={() => setIsDispatchModalOpen(false)}
        />

        {user && isAdmin && (
          <AdminPanel
            userUid={user.uid}
            isOpen={isAdminModalOpen}
            setIsOpen={setIsAdminModalOpen}
          />
        )}

        <div className={extraStyles.container} style={{ paddingTop: '100px', minHeight: '100vh', paddingBottom: '40px', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <SteamMarketplace showAll={true} />
        </div>

        <Footer />
      </main>
    </>
  );
}
