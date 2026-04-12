'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { ShoppingBag, Clock, User, CheckCircle, Activity } from 'lucide-react';
import styles from './LiveTransactions.module.css';

interface Transaction {
  id: string;
  gameName: string;
  userName: string;
  amount: string;
  status: string;
  timestamp: number;
  type?: string;
}

import { getRealActivity } from '@/lib/live-actions';

export default function LiveTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const activityRef = ref(rtdb, 'live_activity');
    const q = query(activityRef, limitToLast(10));

    const loadRealFallback = async () => {
        const history = await getRealActivity();
        if (history && history.length > 0) {
            setTransactions(history as any);
        }
        setIsLoaded(true);
    };

    const unsubscribe = onValue(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const docs = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val,
        })).sort((a, b) => b.timestamp - a.timestamp) as Transaction[];
        setTransactions(docs);
        setIsLoaded(true);
      } else {
        // Fetch real historical data from Firestore if RTDB is empty
        loadRealFallback();
      }
    }, (error) => {
      console.error("RTDB Error:", error);
      loadRealFallback();
    });

    return () => unsubscribe();
  }, []);

  if (!isLoaded && transactions.length === 0) return null;

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <motion.div 
            className={styles.badge}
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            style={{ cursor: 'pointer' }}
        >
            <Activity size={12} className={styles.pulse} /> Live Protocol
        </motion.div>
        <h2 className={styles.title}>Global <span className={styles.highlight}>Market Activity</span></h2>
      </div>

      <div className={styles.container}>
        <AnimatePresence mode="popLayout">
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              className={styles.transactionCard}
              initial={{ rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              exit={{ rotateX: 90, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              layout
            >
              <div className={styles.cardInfo}>
                <div className={styles.statusRow}>
                   <motion.div 
                     className={styles.userName}
                     whileHover={{ scale: 1.1, rotate: -2 }}
                    >
                        <User size={14} /> {tx.userName}
                   </motion.div>
                   <motion.div 
                     className={styles.statusBadge}
                     whileHover={{ scale: 1.1, rotate: 2 }}
                    >
                        <CheckCircle size={10} /> {tx.status}
                   </motion.div>
                </div>
                
                <div className={styles.mainInfo}>
                    <div className={styles.iconBox}>
                        <ShoppingBag size={20} />
                    </div>
                    <div className={styles.gameInfo}>
                        <motion.span 
                          className={styles.gameLabel}
                          whileHover={{ scale: 1.1, rotate: 1 }}
                        >
                          {tx.type === 'SPECIAL_OFFER' ? 'Special Deal' : 'New Acquisition'}
                        </motion.span>
                        <h3 className={styles.gameTitle}>{tx.gameName}</h3>
                    </div>
                </div>

                <div className={styles.footerRow}>
                    <motion.div 
                      className={styles.priceTag}
                      whileHover={{ scale: 1.1, rotate: -3 }}
                    >
                        ${tx.amount}
                    </motion.div>
                    <motion.div 
                      className={styles.timeTag}
                      whileHover={{ scale: 1.1, rotate: 3 }}
                    >
                        <Clock size={12} /> {tx.timestamp ? formatTime(new Date(tx.timestamp)) : 'Recent'}
                    </motion.div>
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
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
