'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { ShoppingBag, Clock, User, CheckCircle, Activity } from 'lucide-react';
import styles from './LiveTransactions.module.css';
// import { getRealActivity } from '@/lib/live-actions'; // Removed fallback to fix ghost data issues

interface Transaction {
  id: string;
  gameName: string;
  userName: string;
  userPhoto?: string;
  gameId?: string;
  amount: string;
  status: string;
  timestamp: number;
  type?: string;
}

export default function LiveTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const activityRef = ref(rtdb, 'live_activity');
    const q = query(activityRef, limitToLast(12));

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const docs = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        })).sort((a, b) => b.timestamp - a.timestamp) as Transaction[];
        setTransactions(docs);
      } else {
        setTransactions([]);
      }
      setIsLoaded(true);
    }, (error) => {
      if (!error.message.includes('permission_denied')) {
        console.error("RTDB Error:", error);
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  if (!isLoaded && transactions.length === 0) return null;

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.badge}>
          <Activity size={12} className={styles.pulse} /> Live Terminal
        </div>
        <h2 className={styles.title}>Global <span className={styles.highlight}>Market Activity</span></h2>
      </div>

      <div className={styles.container}>
        <AnimatePresence mode="popLayout">
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              className={styles.transactionCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              layout
            >
              <div className={styles.cardInfo}>
                <div className={styles.statusRow}>
                  <div className={styles.userName}>
                    <User size={12} /> {tx.userName?.split(' ')[0] || "Comrade"}
                  </div>
                  <div className={`${styles.statusBadge} ${tx.status !== 'COMPLETED' ? styles.pending : ''}`}>
                    {tx.status === 'COMPLETED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                    {tx.status === 'COMPLETED' ? 'Verified' : 'Processing'}
                  </div>
                </div>

                <div className={styles.mainInfo}>
                    <div className={styles.iconBox}>
                      {(tx.type === 'SPECIAL_OFFER' || tx.gameId) ? (
                        <img
                          src={`https://cdn.akamai.steamstatic.com/steam/apps/${tx.gameId || '440'}/header.jpg`}
                          alt="game"
                          className={styles.gameLogo}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60/1a1a1a/feb60c?text=GAME';
                          }}
                        />
                      ) : (
                        tx.userPhoto ? (
                          <img src={tx.userPhoto} alt="profile" className={styles.profileLogo} />
                        ) : (
                          <ShoppingBag size={20} />
                        )
                      )}
                    </div>
                  <div className={styles.gameInfo}>
                    <span className={styles.gameLabel}>
                      {tx.type === 'SPECIAL_OFFER' ? 'Special Deal' : 'New Acquisition'}
                    </span>
                    <h3 className={styles.gameTitle}>{tx.gameName}</h3>
                  </div>
                </div>

                <div className={styles.footerRow}>
                  <div className={styles.priceTag}>
                    ${tx.amount}
                  </div>
                  <div className={styles.timeTag}>
                    <Clock size={12} /> {tx.timestamp ? formatTime(new Date(tx.timestamp)) : 'Recent'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          {transactions.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.loader}></div>
              Waiting for incoming transmissions...
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function formatTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
