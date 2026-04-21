'use client';

import Link from 'next/link';
import { Gamepad2, Menu, X, User, Shield, Tag, Swords, Plus, FileUp } from 'lucide-react';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import ThemeToggle from '../ThemeToggle';
import styles from '../../app/page.module.css';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function Header({ isMobileMenuOpen, setIsMobileMenuOpen }: { isMobileMenuOpen: boolean, setIsMobileMenuOpen: (v: boolean) => void }) {
  const { user, isAdmin, isAuthLoading, logout } = useAuth();
  const { setIsAuthModalOpen, setIsAdminModalOpen, setIsCouponModalOpen, setIsAddOfferModalOpen, setIsListGameOpen, setIsDispatchModalOpen } = useModals();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <header className={styles.header}>
      <div className={styles.navLinks}>
        <Link href="/" className={styles.link}>Home</Link>
        <Link href="/blog" className={styles.link}>Blog</Link>
        <Link href="/#about" className={styles.link}>About</Link>
        <Link href="/#games" className={styles.link}>Games</Link>
        <Link href="/#affiliates" className={styles.link}>Affiliates</Link>
        <Link href="/#keys" className={styles.link}>Keys</Link>
        <Link href="/#community" className={styles.link}>Community</Link>
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
                  onClick={() => setIsDispatchModalOpen(true)}
                  title="List New Dispatch (Blog)"
                  style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                >
                  <FileUp size={18} />
                </button>
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
              <Link href="/account" style={{ textDecoration: 'none' }}>
                <button
                  className="btnSolid"
                  title="My Account"
                  style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
                >
                  {user.photoURL ? (
                    <Image width={18} height={18} quality={75} src={user.photoURL} alt="avatar" style={{ borderRadius: '50%' }} />
                  ) : (
                    <User size={18} />
                  )}
                  <span className={styles.connectText}>{user.displayName?.split(' ')[0] || "Account"}</span>
                </button>
              </Link>
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
