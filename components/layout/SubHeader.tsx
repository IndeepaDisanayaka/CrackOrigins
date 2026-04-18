'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/contexts/AuthContext';
import KoFi from '@/lib/co-fi';
import styles from '../../app/page.module.css';

export default function SubHeader() {
  const { country } = useAuth();

  return (
    <motion.div
      className={styles.subHeader}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <div className={styles.badge}>
        <span className={styles.statusDot}></span>
        <span className={styles.typingText}>Building the next hit</span>
      </div>
      <div className={`${styles.badge} ${styles.badgeRight}`}>
        {country === 'Unknown' ? 'UNKNOWN' : country}
      </div>
      <KoFi />
    </motion.div>
  );
}
