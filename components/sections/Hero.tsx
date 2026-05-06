'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Skull, Target, Trophy, Star, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import styles from '../../app/page.module.css';

export default function Hero() {
  return (
    <motion.section
      className={styles.hero}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
    >
      <div className={styles.heroContainer}>
        {/* Left Column: Content */}
        <div className={styles.heroContent}>
          <div className={`${styles.heroBadge} animateText animateText1`}>
            <span className={styles.badgeNew}>Notice</span>
            <span className={styles.badgeText}>Collect unique experiences with CO's</span>
          </div>

          <h1 className={`${styles.heroTitle} animateText animateText2`}>
            CRACK ORIGINS:<br />
            <span className={styles.highlight}>A NEW PAGE IN HISTORY.</span>
          </h1>

          <p className={`${styles.heroSubtitle} animateText animateText3`}>
            Crack Origins (CO's) is an indie game team on a mission to redefine the industry. By turning the page on traditional development and embracing a culture of bold innovation, we are rising to create the next unique masterpiece guided by community ideas.
          </p>

          <div className={`${styles.heroActions} animateText animateText4`}>
            <a href='#games' className={`btnSolid ${styles.btnLarge}`}>
              Play Our Games
            </a>
            <a href='#about' className={`btnOutline ${styles.btnLarge}`}>
              See Portfolio
            </a>
          </div>

          {/* trust showing... */}
          {/* <div className={`${styles.heroTrust} animateText animateText5`}>
            <div className={styles.trustAvatars}>
              <Image src="/favicon-dark.png" alt="User" width={40} height={40} className={styles.avatarImg} />
              <Image src="/favicon-yellow.png" alt="User" width={40} height={40} className={styles.avatarImg} />
              <Image src="/favicon-icon-white.png" alt="User" width={40} height={40} className={styles.avatarImg} />
              <Image src="/favicon-icon-black.png" alt="User" width={40} height={40} className={styles.avatarImg} />
            </div>
            <div className={styles.trustRating}>
              <div className={styles.stars}>
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <span className={styles.trustText}>Trusted by 2k+ User</span>
            </div>
          </div> */}
        </div>

        {/* Right Column: Visual Mockup */}
        <div className={`${styles.heroVisual} animateText animateText2`}>
          {/* Parallax floating icons */}
          <div className={`${styles.floatingBox} ${styles.box1}`}>
            <Swords size={48} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box2}`}>
            <Skull size={36} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box3}`}>
            <Target size={60} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box4}`}>
            <Trophy size={42} />
          </div>

          {/* Window Mockup */}
          <div className={styles.mockupWindow}>
            <div className={styles.mockupHeader}>
              <div className={`${styles.mockupDot} ${styles.dotRed}`}></div>
              <div className={`${styles.mockupDot} ${styles.dotYellow}`}></div>
              <div className={`${styles.mockupDot} ${styles.dotGreen}`}></div>
            </div>
            <div className={styles.mockupBody}>
              <Image draggable={false} src="/favicon-icon-black.png" alt="Crack Origins" width={120} height={120} className={`logo-dark ${styles.mockupImage}`} />
              <Image draggable={false} src="/favicon-icon-white.png" alt="Crack Origins" width={120} height={120} className={`logo-light ${styles.mockupImage}`} />
              <h3 className={styles.mockupTitle}>Game Developer Studio</h3>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
