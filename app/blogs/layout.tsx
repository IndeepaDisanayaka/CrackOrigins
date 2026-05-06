'use client';

import React, { useState, useEffect } from 'react';
import { useModals } from '@/lib/contexts/ModalContext';
import BlogChatSidebar from '@/components/blog/BlogChatSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderWrapper from '@/components/blog/HeaderWrapper';
import Footer from '@/components/layout/Footer';
import SubHeader from '@/components/layout/SubHeader';
import styles from '../page.module.css';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';

function SearchParamsHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { 
    isBlogChatOpen,
    setIsBlogChatOpen, 
  } = useModals();

  const isDetailPage = pathname !== '/blogs' && pathname !== '/blogs/';

  // Handle opening from URL - only run when URL changes
  useEffect(() => {
    if (isDetailPage && searchParams.get('chat') === 'true') {
      setIsBlogChatOpen(true);
    }
  }, [isDetailPage, searchParams, setIsBlogChatOpen]);

  // Handle auto-closing when navigating away from detail page
  useEffect(() => {
    if (!isDetailPage && isBlogChatOpen) {
      setIsBlogChatOpen(false);
    }
  }, [isDetailPage, isBlogChatOpen, setIsBlogChatOpen]);

  return null;
}

function SidebarHandler({ 
  isMobile, 
  isBlogChatOpen, 
  isDetailPage, 
  selectedBlogTitle, 
  selectedBlogId, 
  setIsBlogChatOpen 
}: any) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isBlogChatOpen && isDetailPage && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: isMobile ? '100%' : '25%',
            height: '100vh',
            zIndex: 10000,
            background: 'var(--background)'
          }}
        >
          <BlogChatSidebar 
            isOpen={isBlogChatOpen}
            onClose={() => {
              setIsBlogChatOpen(false);
              // Clear the chat=true param from URL to prevent re-opening
              if (searchParams.get('chat') === 'true') {
                router.push(pathname);
              }
            }}
            blogTitle={selectedBlogTitle}
            blogId={selectedBlogId}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const { 
    isBlogChatOpen, 
    setIsBlogChatOpen, 
    selectedBlogTitle, 
    selectedBlogId,
  } = useModals();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use usePathname here instead for layout styling if needed
  const pathname = usePathname();
  const isDetailPage = pathname !== '/blogs' && pathname !== '/blogs/';

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      width: '100vw', 
      overflowX: 'hidden',
      background: 'var(--background)',
      position: 'relative',
      ['--header-width' as any]: isBlogChatOpen && isDetailPage ? '75%' : '100%',
      ['--sidebar-width' as any]: isBlogChatOpen && isDetailPage ? '25%' : '0%'
    }}>
      {/* Background Animation */}
      <div className={styles.backgroundAnimation}></div>

      {/* Main Blog Content Area */}
      <motion.div 
        style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Prevent flex items from overflowing
          position: 'relative',
          zIndex: 1,
        }}
        animate={{ 
          marginRight: (isBlogChatOpen && isDetailPage && !isMobile) ? '25%' : '0%'
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <React.Suspense fallback={null}>
          <SearchParamsHandler />
        </React.Suspense>

        <React.Suspense fallback={<div className="h-20 bg-black/20 animate-pulse" />}>
          <HeaderWrapper />
        </React.Suspense>
        
        <SubHeader />

        <div style={{ flex: 1, width: '100%' }}>
          {children}
        </div>

        <Footer />
      </motion.div>

      {/* Side Chat - Fixed/Sticky on the right */}
      <React.Suspense fallback={null}>
        <SidebarHandler 
          isMobile={isMobile}
          isBlogChatOpen={isBlogChatOpen}
          isDetailPage={isDetailPage}
          selectedBlogTitle={selectedBlogTitle}
          selectedBlogId={selectedBlogId}
          setIsBlogChatOpen={setIsBlogChatOpen}
        />
      </React.Suspense>
    </div>
  );
}
