'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { YOUTUBE_SVG, INSTAGRAM_SVG, DISCORD_SVG, revealVariants, staggerContainer } from '../../lib/constants';
import { Users, Globe, Zap } from 'lucide-react';
import styles from '../ExtraSections.module.css';

export default function CommunitySection() {
  return (
    <div className={styles.bottomWrapper}>
      <motion.section
        className={styles.section}
        id="community"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Stay Connected</span>
        <h2 className={styles.sectionTitle}>Join the Community</h2>
        <motion.div className={styles.socialsGrid} variants={staggerContainer}>
          <motion.a href="https://www.youtube.com/@crackorigins" target='_blank' className={styles.socialCard} variants={revealVariants}>
            {YOUTUBE_SVG}
            <span className={styles.socialName}>YouTube</span>
            <span className={styles.socialHandle}>@crackorigins</span>
          </motion.a>
          <motion.a href="https://www.instagram.com/indeepadisanayaka?igsh=MTQ4ZWY0bWozMXp5bg%3D%3D&utm_source=qr" target='_blank' className={styles.socialCard} variants={revealVariants}>
            {INSTAGRAM_SVG}
            <span className={styles.socialName}>Instagram</span>
            <span className={styles.socialHandle}>@indeepadisanayaka</span>
          </motion.a>
          <motion.a href="https://discord.gg/qsAWD52yNc" target='_blank' className={`${styles.socialCard} ${styles.discordCard}`} variants={revealVariants}>
            {DISCORD_SVG}
            <span className={styles.socialName}>Discord</span>
            <span className={styles.socialHandle}>Join 2k+ members</span>
          </motion.a>
        </motion.div>
      </motion.section>

      <motion.section
        className={styles.section}
        id="influence"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Network Status</span>
        <h2 className={styles.sectionTitle}>Global Influence</h2>
        <div className={styles.investGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className={styles.investCard}>
            <div className={styles.investIcon}><Users size={24} /></div>
            <h3 className={styles.investTitle}>Elite Vanguard</h3>
            <p className={styles.investDesc}>2,500+ active operatives collaborating across Discord and GitHub.</p>
          </div>
          <div className={styles.investCard}>
            <div className={styles.investIcon}><Globe size={24} /></div>
            <h3 className={styles.investTitle}>Global Nodes</h3>
            <p className={styles.investDesc}>Direct partnerships with 12+ independent game studios worldwide.</p>
          </div>
          <div className={styles.investCard}>
            <div className={styles.investIcon}><Zap size={24} /></div>
            <h3 className={styles.investTitle}>Neural Sync</h3>
            <p className={styles.investDesc}>Processing 50+ unique gameplay concepts and story chronicles weekly.</p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
