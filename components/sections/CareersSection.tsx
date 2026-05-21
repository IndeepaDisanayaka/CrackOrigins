'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { JOIN_ROLES, revealVariants, staggerContainer } from '../../lib/constants';
import ApplyModal from '../modals/ApplyModal';
import styles from '../ExtraSections.module.css';

export default function CareersSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const openApplyModal = (roleTitle: string) => {
    setSelectedRole(roleTitle);
    setIsModalOpen(true);
  };

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
      </div>
      <p className={styles.sectionSubtext}>
        We&apos;re looking for talented individuals who share our passion for creating exceptional games.
      </p>
      <motion.div
        className={`${styles.rolesGrid}`}
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
              <button 
                className="btnOutline" 
                onClick={() => openApplyModal(role.title)}
              >
                Apply Now <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      <ApplyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedRole={selectedRole} />
    </motion.section>
  );
}

