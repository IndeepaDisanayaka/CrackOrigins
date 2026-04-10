'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import styles from '../ExtraSections.module.css';

export default function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, ms: 0 });

  useEffect(() => {
    const update = () => {
      const distance = new Date(endTime).getTime() - Date.now();
      if (distance < 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0, ms: 0 });
        return;
      }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
        ms: Math.floor((distance % 1000) / 10)
      });
    };
    update();
    const timer = setInterval(update, 40); // Fast interval for MS
    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className={styles.timer}>
      <Clock size={12} color="#000" />
      <span className={styles.timerVal}>
        {timeLeft.d.toString().padStart(2, '0')}
        <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: '1px' }}>D</span>
      </span>
      <span className={styles.timerVal}>
        {timeLeft.h.toString().padStart(2, '0')}
        <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: '1px' }}>H</span>
      </span>
      <span className={styles.timerVal}>
        {timeLeft.m.toString().padStart(2, '0')}
        <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: '1px' }}>M</span>
      </span>
      <span className={styles.timerVal}>
        {timeLeft.s.toString().padStart(2, '0')}
        <span style={{ fontSize: '0.6rem', opacity: 0.8, marginLeft: '1px' }}>S</span>
      </span>
      <span className={styles.timerVal} style={{ opacity: 0.6, fontSize: '0.75rem', width: '18px', textAlign: 'center' }}>
        {timeLeft.ms.toString().padStart(2, '0')}
      </span>
      <span className={styles.timerLabel}>Left</span>
    </div>
  );
}
