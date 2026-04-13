'use client';

import React from 'react';
import { Gamepad2, X, Users, Briefcase, MessageSquare, User, Tag, Swords, Shield, Plus } from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import Link from 'next/link';
import styles from '../../app/page.module.css';

export default function MobileNav({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const { user, isAdmin, logout } = useAuth();
  const { setIsListGameOpen, setIsCouponModalOpen, setIsAddOfferModalOpen, setIsAdminModalOpen, setIsAuthModalOpen } = useModals();

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
        {isAdmin && (
          <>
            <a href="#list-game" onClick={() => { setIsOpen(false); setIsListGameOpen(true); }} className={styles.mobileLink}>
              <Plus size={18} /> List a Game
            </a>
            <a href="#coupons" onClick={() => { setIsOpen(false); setIsCouponModalOpen(true); }} className={styles.mobileLink}>
              <Tag size={18} /> Discount
            </a>
            <a href="#offers" onClick={() => { setIsOpen(false); setIsAddOfferModalOpen(true); }} className={styles.mobileLink}>
              <Swords size={18} /> Offers
            </a>
            <a href="#admin" onClick={() => { setIsOpen(false); setIsAdminModalOpen(true); }} className={styles.mobileLink}>
              <Shield size={18} /> Admin Panel
            </a>
          </>
        )}
        <a href="#teams" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <MessageSquare size={18} /> Community
        </a>
      </div>

      <div className={styles.mobileNavFooter}>
        {user ? (
          <>
            <div className={styles.mobileUser}>
              <img src={user.photoURL || ""} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
              <span>{user.displayName}</span>
            </div>
            <button 
              className="btnSolid" 
              onClick={() => { setIsOpen(false); logout(); }}
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', cursor: 'pointer' }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <div className={styles.mobileUser}>
              <User size={20} />
              <span>Guest User</span>
            </div>
            <button 
              className="btnSolid" 
              onClick={() => { setIsOpen(false); setIsAuthModalOpen(true); }}
              style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', cursor: 'pointer' }}
            >
              Connect Google
            </button>
          </>
        )}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
          <Link href="/terms" onClick={() => setIsOpen(false)} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase' }}>
            Terms & Privacy
          </Link>
        </div>
        <p>© 2026 Crack Origins Studio. All rights reserved.</p>
      </div>
    </div>
  );
}
