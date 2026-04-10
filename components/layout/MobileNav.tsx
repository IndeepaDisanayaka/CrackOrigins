'use client';

import React from 'react';
import { Gamepad2, X, Users, Briefcase, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import Link from 'next/link';
import styles from '../../app/page.module.css';

export default function MobileNav({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const { user } = useAuth();

  return (
    <div className={`${styles.mobileNav} ${isOpen ? styles.mobileNavOpen : ''}`}>
      <div className={styles.mobileNavHeader}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <Gamepad2 size={16} color="#000" />
          </div>
          <span>Crack Origins</span>
        </div>
        <button className={styles.menuToggle} onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>
      </div>
      <div className={styles.mobileNavLinks}>
        <a href="#about" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Users size={18} /> About
        </a>
        <a href="#project" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Gamepad2 size={18} /> Games
        </a>
        <a href="#projects" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Briefcase size={18} /> Projects
        </a>
        <a href="#Affiliates" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Briefcase size={18} /> Affiliates
        </a>
        <a href="#Keys" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Briefcase size={18} /> Keys
        </a>
        <a href="#teams" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <MessageSquare size={18} /> Community
        </a>
      </div>

      <div className={styles.mobileNavFooter}>
        {user ? (
          <div className={styles.mobileUser}>
            <img src={user.photoURL || ""} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <span>{user.displayName}</span>
          </div>
        ) : (
          <div className={styles.mobileUser}>
            <User size={20} />
            <span>Guest User</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
          <Link href="/terms" onClick={() => setIsOpen(false)} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase' }}>
            Terms & Privacy
          </Link>
        </div>
        <p>© 2026 Crack Origins Studio. All rights reserved.</p>
      </div>
    </div>
  );
}
