'use client';

import React from 'react';
import { Gamepad2, X, Users, Briefcase, MessageSquare, User, Tag, Swords, Shield, Plus } from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import Image from 'next/image';
import ThemeToggle from '../ThemeToggle';

export default function MobileNav({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) {
  const { user, isAdmin, isOwner, permissions, logout } = useAuth();
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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ThemeToggle />
          <button className={styles.menuToggle} onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>
      </div>
      <div className={styles.mobileNavLinks}>
        <Link href="/#about" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Users size={18} /> About
        </Link>
        <Link href="/#games" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Gamepad2 size={18} /> Games
        </Link>
        <Link href="/blog" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <MessageSquare size={18} /> Blog
        </Link>
        <Link href="/ideas" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Briefcase size={18} /> Ideas
        </Link>
        <Link href="/#keys" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <Swords size={18} /> Keys
        </Link>
        {isAdmin && (
          <>
            {(isOwner || (permissions['games'] || []).includes('WRITE')) && (
              <button onClick={() => { setIsOpen(false); setIsListGameOpen(true); }} className={styles.mobileLink} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <Plus size={18} /> List a Game
              </button>
            )}
            {(isOwner || (permissions['coupons'] || []).includes('WRITE')) && (
              <button onClick={() => { setIsOpen(false); setIsCouponModalOpen(true); }} className={styles.mobileLink} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <Tag size={18} /> Discount
              </button>
            )}
            {(isOwner || (permissions['offers'] || []).includes('WRITE')) && (
              <button onClick={() => { setIsOpen(false); setIsAddOfferModalOpen(true); }} className={styles.mobileLink} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <Swords size={18} /> Offers
              </button>
            )}
            <button onClick={() => { setIsOpen(false); setIsAdminModalOpen(true); }} className={styles.mobileLink} style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              <Shield size={18} /> Admin Panel
            </button>
          </>
        )}
        <Link href="/#community" onClick={() => setIsOpen(false)} className={styles.mobileLink}>
          <MessageSquare size={18} /> Community
        </Link>
      </div>

      <div className={styles.mobileNavFooter}>
        {user ? (
          <>
            <div className={styles.mobileUser}>
              {user.photoURL ? (
                <Image width={32} height={32} quality={75} src={user.photoURL} alt="avatar" style={{ borderRadius: '50%' }} />
              ) : (
                <User size={32} />
              )}
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
