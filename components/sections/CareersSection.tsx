'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { JOIN_ROLES, revealVariants, staggerContainer } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function CareersSection() {
  return (
    <motion.section
      className={styles.section}
      id="join"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={revealVariants}
    >
      <span className="sectionLabel">Careers</span>
      <div className={styles.sectionTitleRow}>
        <h2 className={styles.sectionTitle}>Join With Us</h2>
        <span className={styles.comingSoonBadge}>
          <Clock size={14} />
          Coming Soon
        </span>
      </div>
      <p className={styles.sectionSubtext}>
        We&apos;re looking for talented individuals who share our passion for creating exceptional games.
      </p>
      <motion.div
        className={`${styles.rolesGrid} ${styles.comingSoonOverlay}`}
        variants={staggerContainer}
      >
        {JOIN_ROLES.map((role, i) => (
          <motion.div key={i} className={styles.roleCard} variants={revealVariants}>
            <div className={styles.roleHeader}>
              <div className={styles.roleIcon}>{role.icon}</div>
              <div>
                <h3 className={styles.roleTitle}>{role.title}</h3>
                <span className={styles.roleType}>{role.type}</span>
              </div>
            </div>
            <p className={styles.roleDesc}>{role.desc}</p>
            <div>
              <button className="btnOutline" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Apply Now <ArrowRight size={14} /></button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

