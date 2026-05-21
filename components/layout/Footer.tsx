'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Footer.module.css';
import { YOUTUBE_SVG, INSTAGRAM_SVG, DISCORD_SVG } from '../../lib/constants';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Image src="/favicon-yellow.png" alt="Crack Origins" width={40} height={40} className="logo-dark" />
              <Image src="/favicon-yellow.png" alt="Crack Origins" width={40} height={40} className="logo-light" />
            </div>
            Crack Origins
          </div>
          <p className={styles.description}>
            The ultimate hub for indie game development, premium chronicles, 
            and community-driven gaming projects. Unleash high-performance experiences.
          </p>
          <div className={styles.socialLinks}>
            <a href="https://www.youtube.com/@crackorigins" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="YouTube">
              {YOUTUBE_SVG}
            </a>
            <a href="https://www.instagram.com/indeepadisanayaka?igsh=MTQ4ZWY0bWozMXp5bg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
              {INSTAGRAM_SVG}
            </a>
            <a href="https://discord.gg/qsAWD52yNc" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Discord">
              {DISCORD_SVG}
            </a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Product</h4>
          <div className={styles.links}>
            <Link href="/games">Our Games</Link>
            <Link href="/offers">Offer Marketplace</Link>
            <Link href="/?ref=affiliate">Affiliate Program</Link>
            <Link href="/blog">Gaming Chronicles</Link>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Resources</h4>
          <div className={styles.links}>
            <Link href="/blog">Blog</Link>
            <Link href="/?faq=all">FAQ</Link>
            <a href="https://discord.gg/qsAWD52yNc" target="_blank" rel="noopener noreferrer">Help Center</a>
          </div>
        </div>

        <div className={styles.column}>
          <h4>Legal</h4>
          <div className={styles.links}>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/terms#privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>© 2026 Crack Origins. All rights reserved.</p>
        <p>Built for the Gaming Community</p>
      </div>
    </footer>
  );
}
