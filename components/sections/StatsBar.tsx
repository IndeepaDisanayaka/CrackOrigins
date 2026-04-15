'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Counter from '../Counter';
import styles from '../../app/page.module.css';

export default function StatsBar() {
  return (
    <motion.div
      className={styles.statsBar}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      viewport={{ once: true }}
    >
      <div className={styles.statItem}>
        <div className={styles.statNumber}><Counter end={4} suffix="+" /></div>
        <div className={styles.statLabel}>Games Released</div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statNumber}><Counter end={10} suffix="k+" /></div>
        <div className={styles.statLabel}>Active Players</div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statNumber}><Counter end={5} suffix="k+"/></div>
        <div className={styles.statLabel}>Games Sold</div>
      </div>
      <div className={styles.statItem}>
        <div className={styles.statNumber}><Counter end={1} /></div>
        <div className={styles.statLabel}>Upcoming</div>
      </div>
    </motion.div>
  );
}
