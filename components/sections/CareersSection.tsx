'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { JOIN_ROLES, revealVariants, staggerContainer } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function CareersSection() {
  return (
    <motion.section
      className={styles.section}
      id="careers"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={revealVariants}
    >
      <span className="sectionLabel">Careers</span>
      <h2 className={styles.sectionTitle}>Join With Us</h2>
      <p className={styles.sectionSubtext}>
        We&apos;re looking for talented individuals who share our passion for creating exceptional games.
      </p>
      <motion.div
        className={styles.rolesGrid}
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
              <button className="btnOutline">Apply Now <ArrowRight size={14} /></button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}
