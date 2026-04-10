'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { VALUES, revealVariants } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function AboutSection() {
  return (
    <motion.section
      className={styles.section}
      id="about"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={revealVariants}
    >
      <div className={styles.aboutGrid}>
        <div className={styles.aboutVisual}>
          <div className={styles.aboutCard}>
            <div className={styles.aboutCardBg}></div>
            <span className="sectionLabel">Our Creed</span>
            <h2 className={styles.aboutHeroTitle}>Unique Creation.<br /><span>CO's Vision.</span></h2>
            <p className={styles.aboutHeroDesc}>
              We believe in the power of the community. Our mission is to build a platform that discovers unique ideas to craft the next best gaming experience.
            </p>
            <div className={styles.aboutStats}>
              <div className={styles.aboutStatItem}>
                <span className={styles.aboutStatVal}>2025</span>
                <span className={styles.aboutStatLabel}>Est. Year</span>
              </div>
              <div className={styles.aboutStatItem}>
                <span className={styles.aboutStatVal}>4+</span>
                <span className={styles.aboutStatLabel}>Creators</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.aboutDetails}>
          <span className="sectionLabel">Who We Are</span>
          <h2 className={styles.sectionTitle}>The Hero Rebuilding.</h2>
          <p className={styles.aboutText}>
            Crack Origins is born from the legend of a hero paralyzed by a curse, yet he is not dead. His power is rebuilding. This story mirrors our team: an indie collective dedicated to turning a massive page in gaming history by forging unique paths that major studios often overlook.
          </p>
          <div className={styles.aboutValuesList}>
            {VALUES.map((val, i) => (
              <motion.div key={i} className={styles.valueRow} variants={revealVariants}>
                <div className={styles.valueIconSmall}>{val.icon}</div>
                <div className={styles.valueContent}>
                  <h3 className={styles.valueTitleSmall}>{val.title}</h3>
                  <p className={styles.valueDescSmall}>{val.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
