'use client';

import React, { useState, Suspense } from 'react';
import styles from './page.module.css';
import GamesCarousel from '../components/GamesCarousel';
import ExtraSections from '../components/ExtraSections';
import AffiliateSection from '../components/AffiliateSection';
import { useAuth } from '../lib/contexts/AuthContext';
import { useModals } from '../lib/contexts/ModalContext';
import { motion } from 'framer-motion';
import LiveCursors from '../components/LiveCursors';
import AuthModal from '../components/AuthModal';
import AdminPanel from '@/components/AdminPanel';
import Header from '../components/layout/Header';
import MobileNav from '../components/layout/MobileNav';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import StatsBar from '../components/sections/StatsBar';
import Features from '../components/sections/Features';
import LiveTransactions from '../components/sections/LiveTransactions';
import SplashScreen from '../components/layout/SplashScreen';
import SubHeader from '../components/layout/SubHeader';
import CouponModal from '../components/admin/CouponModal';
import AddOfferModal from '../components/admin/AddOfferModal';
import { useSearchParams } from 'next/navigation';

function HomeContent() {
  const { user, isAdmin, login, isAuthLoading, affiliateId, affiliateCount, discount, refreshStatus } = useAuth();
  const { 
    isAuthModalOpen, setIsAuthModalOpen, 
    isAdminModalOpen, setIsAdminModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen
  } = useModals();
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
      <SplashScreen />
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

        <CouponModal 
          isOpen={isCouponModalOpen} 
          onClose={() => setIsCouponModalOpen(false)} 
        />

        <AddOfferModal 
          isOpen={isAddOfferModalOpen} 
          onClose={() => setIsAddOfferModalOpen(false)} 
        />

        {user && isAdmin && (
          <AdminPanel
            userUid={user.uid}
            isOpen={isAdminModalOpen}
            setIsOpen={setIsAdminModalOpen}
          />
        )}

        <SubHeader />

        <Hero />

        <StatsBar />

        <Features />
        <LiveTransactions />
        <div className={styles.sectionDivider}></div>

        <motion.div
          style={{ width: "100%" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <GamesCarousel />
        </motion.div>

        <AffiliateSection
          affiliateId={affiliateId}
          friendsCount={affiliateCount}
          discount={discount}
          onRefresh={refreshStatus}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ExtraSections />
        </motion.div>

        <Footer />

      </main>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f', color: '#fff' }}>Loading Crack Origins...</div>}>
      <HomeContent />
    </Suspense>
  );
}
