'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { YOUTUBE_SVG, INSTAGRAM_SVG, DISCORD_SVG, revealVariants, staggerContainer } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function CommunitySection() {
  return (
    <div className={styles.bottomWrapper}>
      <motion.section
        className={styles.section}
        id="teams"
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
        id="contact"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Let&apos;s Talk</span>
        <h2 className={styles.sectionTitle}>Work With Us</h2>
        <div className={styles.contactCard}>
          <p className={styles.contactDesc}>
            Whether you&apos;re a publisher, creator, or fellow developer — we&apos;re always open to pushing boundaries together.
          </p>
          <div className={`${styles.subscribeRow} animateText animateText5`} style={{ display: "flex" }}>
            <input type="email" placeholder="Enter your email for updates" className={styles.emailInput} />
            <button className="btnSolid" style={{ padding: '0 1.5rem', fontSize: '0.75rem' }}>
              <Mail size={14} /> Get in Touch
            </button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
