'use client';

import React from 'react';
import styles from '../../app/page.module.css';

export default function SplashScreen() {
  return (
    <div className={styles.splashScreen}>
      <div className={styles.splashText}>
        Crack <span>Origins</span>
      </div>
    </div>
  );
}
