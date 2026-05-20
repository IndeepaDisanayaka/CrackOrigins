'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Paintbrush, Users, MessageSquare } from 'lucide-react';
import styles from '../../app/page.module.css';

export default function Features() {
  return (
    <motion.div
      className={styles.featuresWrapper}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className={styles.featureItem}>
        <Paintbrush size={32} className={styles.featureIcon} />
        <span>Expert in Game Design</span>
        <p style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500 }}>Crafting unique mechanics and immersive worlds.</p>
      </div>
      <div className={styles.featureItem}>
        <Users size={32} className={styles.featureIcon} />
        <span>Loved by 20k+ Players</span>
        <p style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500 }}>Community focused development and support.</p>
      </div>
      <div className={styles.featureItem}>
        <MessageSquare size={32} className={styles.featureIcon} />
        <span>Clear Communication</span>
        <p style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 500 }}>Transparent updates and direct dev interaction.</p>
      </div>
    </motion.div>
  );
}
