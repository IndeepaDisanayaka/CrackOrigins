'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Users, Gamepad2, Layers, Download } from 'lucide-react';
import Counter from '../Counter';
import styles from '../../app/page.module.css';
import { getPlatformStats } from '@/lib/live-actions';

const GridSquare = React.memo(() => (
  <div className={styles.gridSquare} />
));

GridSquare.displayName = 'GridSquare';

const GridBackground = () => {
  const squares = useMemo(() => Array.from({ length: 800 }), []); // Reduced count for mobile performance
  
  return (
    <div className={styles.gridBg}>
      {squares.map((_, i) => (
        <GridSquare key={i} />
      ))}
    </div>
  );
};

export default function Hero() {
  const [stats, setStats] = useState({ userCount: 0, gamesCount: 0 });

  useEffect(() => {
    async function fetchStats() {
      const res = await getPlatformStats();
      if (res.success) {
        setStats({
          userCount: res.userCount || 0,
          gamesCount: res.gamesCount || 0
        });
      }
    }
    fetchStats();
  }, []);

  return (
    <section id="hero" className={styles.hero}>
      <GridBackground />
      
      <div className={styles.heroRow}>
        {/* Left: Branding & Copy */}
        <div className={styles.heroMainContent}>
          <div className={styles.heroBadgeRow}>
            <div className={styles.badge}>
              <Users size={12} color="var(--primary)" />
              <span className={styles.badgeText}>TOTAL USERS: <Counter end={stats.userCount || 2000} suffix="+" /></span>
            </div>
            <div className={`${styles.badge} ${styles.badgeRight}`}>
              <Layers size={12} color="black" />
              <span className={styles.badgeText} style={{ color: 'black' }}>PUBLISHED GAMES: <Counter end={stats.gamesCount || 4} /></span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className={styles.heroTitle}>
              CRACK ORIGINS:<br />
              <span className={styles.highlight}>A NEW PAGE</span><br />
              IN HISTORY.
            </h1>
            <p className={styles.heroSubtitle}>
              An indie game team on a mission to redefine the industry. Turning the page on traditional development and embracing bold innovation.
            </p>
          </motion.div>

          <div className={styles.heroActionRow}>
            <a href="#games" className="btnSolid btnLarge">EXPLORE GAMES</a>
            <a href="#ideas" className="btnOutline btnLarge">GAMING IDEAS</a>
          </div>
        </div>

        {/* Right: Integrated Stats & Visuals */}
        <div className={styles.heroVisualContent}>
          <div className={styles.heroStatsGrid}>
            <motion.div 
              className={styles.heroStatCard}
              whileHover={{ y: -5 }}
            >
              <Gamepad2 size={24} color="var(--primary)" />
              <div className={styles.heroStatVal}><Counter end={stats.gamesCount || 4} suffix="+" /></div>
              <div className={styles.heroStatLabel}>Releases</div>
            </motion.div>

            <motion.div 
              className={styles.heroStatCard}
              whileHover={{ y: -5 }}
            >
              <Users size={24} color="var(--primary)" />
              <div className={styles.heroStatVal}><Counter end={Math.floor(stats.userCount * 0.8) || 1600} suffix="+" /></div>
              <div className={styles.heroStatLabel}>Active</div>
            </motion.div>

            <motion.div 
              className={styles.heroStatCard}
              whileHover={{ y: -5 }}
            >
              <Download size={24} color="var(--primary)" />
              <div className={styles.heroStatVal}><Counter end={500} suffix="+" /></div>
              <div className={styles.heroStatLabel}>Downloads</div>
            </motion.div>

            <motion.div 
              className={styles.heroStatCard}
              whileHover={{ y: -5 }}
            >
              <Swords size={24} color="var(--primary)" />
              <div className={styles.heroStatVal}><Counter end={1} /></div>
              <div className={styles.heroStatLabel}>Upcoming</div>
            </motion.div>
          </div>
          
          <div className={styles.mockupWindow} style={{ width: '100%' }}>
            <div className={styles.mockupHeader}>
              <div className={`${styles.mockupDot} ${styles.dotRed}`}></div>
              <div className={`${styles.mockupDot} ${styles.dotYellow}`}></div>
              <div className={`${styles.mockupDot} ${styles.dotGreen}`}></div>
            </div>
            <div className={styles.mockupBody} style={{ minHeight: '200px' }}>
               <h3 className={styles.mockupTitle}>NEXT GEN INDIE STUDIO</h3>
               <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem' }}>CONNECTED TO MAIN THREAD</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
