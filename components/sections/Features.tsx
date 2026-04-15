'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Paintbrush, Users, MessageSquare } from 'lucide-react';
import styles from '../../app/page.module.css';

export default function Features() {
  return (
    <motion.div
      className={styles.featuresWrapper}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
    >
      <div className={styles.featureItem}>
        <Paintbrush size={20} className={styles.featureIcon} />
        Expert in Game Design
      </div>
      <div className={styles.featureItem}>
        <Users size={20} className={styles.featureIcon} />
        Loved by 20k+ Players
      </div>
      <div className={styles.featureItem}>
        <MessageSquare size={20} className={styles.featureIcon} />
        Clear Communication
      </div>
    </motion.div>
  );
}
