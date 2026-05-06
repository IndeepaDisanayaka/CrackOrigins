'use client';

import React, { useState, useEffect } from 'react';
import styles from '../app/page.module.css';
import GamesCarousel from './GamesCarousel';
import ExtraSections from './ExtraSections';
import AffiliateSection from './AffiliateSection';
import { useAuth } from '../lib/contexts/AuthContext';
import { useModals } from '../lib/contexts/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import LiveCursors from './LiveCursors';
import Header from './layout/Header';
import MobileNav from './layout/MobileNav';
import Footer from './layout/Footer';
import Hero from './sections/Hero';
import StatsBar from './sections/StatsBar';
import Features from './sections/Features';
import FAQSection from './sections/FAQSection';
import SplashScreen from './layout/SplashScreen';
import SubHeader from './layout/SubHeader';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('./admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('./admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('./admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('./admin/DispatchModal'), { ssr: false });
const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false });

export default function HomeContent() {
  const { user, isAdmin, login, isAuthLoading, affiliateId, affiliateCount, xp, refreshStatus } = useAuth();

  const [showSplash, setShowSplash] = useState(false);
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

  useEffect(() => {
    const hasBeenShown = sessionStorage.getItem('crack_origins_splash_shown');
    if (!hasBeenShown) {
      setShowSplash(true);
      sessionStorage.setItem('crack_origins_splash_shown', 'true');
      // Hide splash after animation
      const timer = setTimeout(() => setShowSplash(false), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 800); // Wait for splash screen / loading
    }
  }, []);

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
      {showSplash && <SplashScreen />}
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

      <SubHeader />

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

        <Hero />

        <StatsBar />

        <Features />
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
          xp={xp}
          onRefresh={refreshStatus}
        />


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ExtraSections />
        </motion.div>

        <FAQSection />

        <Footer />

      </main>
    </>
  );
}
