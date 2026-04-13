'use client';

import React from 'react';
import { Gamepad2, Menu, X, User, Shield, Tag, Swords, Plus } from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import ThemeToggle from '../ThemeToggle';
import styles from '../../app/page.module.css';

export default function Header({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean, setIsMobileMenuOpen: (v: boolean) => void }) {
  const { user, isAdmin, isAuthLoading, logout } = useAuth();
  const { setIsAuthModalOpen, setIsAdminModalOpen, setIsCouponModalOpen, setIsAddOfferModalOpen, setIsListGameOpen } = useModals();

  return (
    <header className={styles.header}>
      <div className={styles.navLinks}>
        <a href="#about" className={styles.link}>About</a>
        <a href="#project" className={styles.link}>Games</a>
        <a href="#Affiliates" className={styles.link}>Affiliates</a>
        <a href="#Keys" className={styles.link}>Keys</a>

        <a href="#teams" className={styles.link}>Community</a>
      </div>

      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Gamepad2 size={16} color="#000" />
        </div>
        <span>Crack Origins</span>
      </div>

      <div className={styles.headerActions}>
        <ThemeToggle />
        {isAuthLoading ? (
          <div className="premiumLoader">
            <Gamepad2 className="pulseIcon" size={24} />
          </div>
        ) : user ? (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {isAdmin && (
              <>
                <button
                  className={`${styles.desktopOnlyAction} btnOutline`}
                  onClick={() => setIsListGameOpen(true)}
                  title="List New Game"
                  style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                >
                  <Plus size={18} />
                </button>
                <button
                  className={`${styles.desktopOnlyAction} btnOutline`}
                  onClick={() => setIsCouponModalOpen(true)}
                  title="Discount Coupons"
                  style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                >
                  <Tag size={18} />
                </button>
                <button
                  className={`${styles.desktopOnlyAction} btnOutline`}
                  onClick={() => setIsAddOfferModalOpen(true)}
                  title="Game Offers"
                  style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                >
                  <Swords size={18} />
                </button>
                <button
                  className={`${styles.desktopOnlyAction} btnOutline`}
                  onClick={() => setIsAdminModalOpen(true)}
                  title="Open Admin Panel"
                  style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                >
                  <Shield size={18} />
                </button>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.4rem' }} className={styles.desktopOnlyAction}>
              <button
                className="btnSolid"
                onClick={logout}
                title="Click to Sign Out"
                style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="avatar" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                ) : (
                  <User size={18} />
                )}
                <span className={styles.connectText}>{user.displayName?.split(' ')[0]}</span>
              </button>
            </div>
          </div>
        ) : (
          <button className={`${styles.desktopOnlyAction} btnSolid`} onClick={() => setIsAuthModalOpen(true)} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
            <User size={14} /> <span className={styles.connectText}>Connect Google</span>
          </button>
        )}

        <button 
          className={styles.menuToggle} 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </header>
  );
}
