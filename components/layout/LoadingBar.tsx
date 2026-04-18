'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function LoadingBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Trigger loading state on route change
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600); // Progress bar duration

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ width: 0, opacity: 1 }}
          animate={{ width: '100%' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '3px',
            backgroundColor: 'var(--primary)',
            zIndex: 10000,
            boxShadow: '0 0 10px var(--primary)',
            pointerEvents: 'none',
          }}
        />
      )}
    </AnimatePresence>
  );
}

export default function LoadingBar() {
  return (
    <Suspense fallback={null}>
      <LoadingBarContent />
    </Suspense>
  );
}
