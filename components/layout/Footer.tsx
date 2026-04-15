'use client';

import React from 'react';
import { Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import styles from '../../app/page.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLeft}>
        <div className={styles.logoIcon}>
          <Gamepad2 size={12} color="#000" />
        </div>
        Crack Origins
      </div>
      <div className={styles.footerLinks}>
        <a href="#about">About</a>
        <a href="#project">Games</a>
        <a href="#projects">Projects</a>
        <a href="#teams">Community</a>
        <a href="#contact">Contact</a>
        <Link href="/terms">Terms & Privacy</Link>
      </div>
      <div className={styles.footerRight}>
        © 2026 Crack Origins. All rights reserved.
      </div>
    </footer>
  );
}
