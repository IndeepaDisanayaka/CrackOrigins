'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Skull, Target, Ghost, Trophy, Zap, Gamepad2, Send } from 'lucide-react';
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
      <div className={`${styles.floatingBox} ${styles.box1}`}>
        <Swords size={32} />
      </div>
      <div className={`${styles.floatingBox} ${styles.box2}`}>
        <Skull size={24} />
      </div>
      <div className={`${styles.floatingBox} ${styles.box3}`}>
        <Target size={40} />
      </div>
      <div className={`${styles.floatingBox} ${styles.box4}`}>
        <Ghost size={28} />
      </div>
      <div className={`${styles.floatingBox} ${styles.box5}`}>
        <Trophy size={36} />
      </div>
      <div className={`${styles.floatingBox} ${styles.box6}`}>
        <Zap size={22} />
      </div>

      <div className={`${styles.avatarWrapper} animateText animateText1`}>
        <div className={`${styles.avatarShape} ${styles.controllerAnim}`}>
          <Gamepad2 size={32} color="#000" />
        </div>
      </div>

      <h1 className={`${styles.title} animateText animateText2`}>
        CRACK ORIGINS:<br />
        <span className={styles.highlight}>A NEW PAGE IN HISTORY.</span>
      </h1>
      <p className={`${styles.subtitle} animateText animateText3`}>
        Crack Origins (CO's) is an indie game team on a mission to redefine the industry. By turning the page on traditional development and embracing a culture of bold innovation, we are rising to create the next unique masterpiece guided by community ideas.
      </p>

      <div className={`${styles.actionButtons} animateText animateText4`}>
        <a href='#project' className={`btnSolid ${styles.btnLarge}`} style={{textDecoration:"none"}}>
          Play Our Games
        </a>
        <a href='#about' className={`btnOutline ${styles.btnLarge}`} style={{textDecoration:"none"}}>
          See Portfolio
        </a>
      </div>
    </motion.section>
  );
}
