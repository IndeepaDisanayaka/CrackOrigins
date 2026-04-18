'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HelpChat from './HelpChat';

export default function FloatingControls() {
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 500) {
        setIsScrollVisible(true);
      } else {
        setIsScrollVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const btnStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: '#000',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: 'none', // Removed shadows as requested
    flexShrink: 0
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '5.5rem',
      right: '2rem',
      zIndex: 9999999,
      display: 'flex',
      flexDirection: 'row-reverse',
      gap: '1rem',
      alignItems: 'flex-end',
      pointerEvents: 'none' // Allow clicking through the container background
    }}>
      {/* Container for Buttons - Reactivate pointer events */}
      <div style={{ display: 'flex', gap: '1rem', pointerEvents: 'auto' }}>
        
        {/* Chat Component - Now handles its own internal window but we control the toggle here */}
        <div style={{ position: 'relative' }}>
          <HelpChat externalOpen={isChatOpen} setExternalOpen={setIsOpen => setIsChatOpen(setIsOpen)} customToggle={
            <motion.button
              onClick={() => setIsChatOpen(!isChatOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={btnStyle}
              aria-label="Support Chat"
            >
              {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </motion.button>
          } />
        </div>

        {/* Scroll To Top Button */}
        <AnimatePresence>
          {isScrollVisible && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              onClick={scrollToTop}
              aria-label="Scroll to top"
              style={btnStyle}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronUp size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
