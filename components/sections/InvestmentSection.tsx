'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { INVEST_PERKS, revealVariants, staggerContainer } from '../../lib/constants';
import styles from '../ExtraSections.module.css';

export default function InvestmentSection() {
  return (
    <motion.section
      className={styles.section}
      id="invest"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={revealVariants}
    >
      <span className="sectionLabel">Opportunity</span>
      <h2 className={styles.sectionTitle}>Invest In Our Games</h2>
      <p className={styles.sectionSubtext}>
        Back the next generation of indie games. Join our investor program and grow with us.
      </p>
      <motion.div
        className={styles.investGrid}
        variants={staggerContainer}
      >
        {INVEST_PERKS.map((perk, i) => (
          <motion.div key={i} className={styles.investCard} variants={revealVariants}>
            <div className={styles.investIcon}>{perk.icon}</div>
            <h3 className={styles.investTitle}>{perk.title}</h3>
            <p className={styles.investDesc}>{perk.desc}</p>
          </motion.div>
        ))}
      </motion.div>
      <motion.div className={styles.investCta} variants={revealVariants}>
        <button className="btnSolid">
          This feature is not yet available. <ArrowRight size={16} />
        </button>
      </motion.div>
    </motion.section>
  );
}
