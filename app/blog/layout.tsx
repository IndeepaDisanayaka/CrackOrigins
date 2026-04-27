'use client';

import React, { useState, useEffect } from 'react';
import { useModals } from '@/lib/contexts/ModalContext';
import BlogChatSidebar from '@/components/blog/BlogChatSidebar';
import { motion, AnimatePresence } from 'framer-motion';
import HeaderWrapper from '@/components/blog/HeaderWrapper';
import Footer from '@/components/layout/Footer';
import SubHeader from '@/components/layout/SubHeader';
import styles from '../page.module.css';

import { usePathname, useSearchParams } from 'next/navigation';

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const { 
    isBlogChatOpen, 
    setIsBlogChatOpen, 
    selectedBlogTitle, 
    selectedBlogId,
    setSelectedBlogId
  } = useModals();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // The chat sidebar only exists on individual post pages (/blog/[slug])
  const isDetailPage = pathname !== '/blog' && pathname !== '/blog/';

  React.useEffect(() => {
    if (isDetailPage && searchParams.get('chat') === 'true') {
      setIsBlogChatOpen(true);
      // We don't have the title/id here easily, 
      // but the blog-post component will set them on mount
    }
    
    // Auto-close if we navigate back to the list page
    if (!isDetailPage && isBlogChatOpen) {
      setIsBlogChatOpen(false);
    }
  }, [isDetailPage, searchParams, setIsBlogChatOpen]);

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
              onClose={() => setIsBlogChatOpen(false)}
              blogTitle={selectedBlogTitle}
              blogId={selectedBlogId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
