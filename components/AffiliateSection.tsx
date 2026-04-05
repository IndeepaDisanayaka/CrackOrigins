'use client';
import React, { useState } from 'react';
import styles from './AffiliateSection.module.css';
import { UserPlus, Share2, Ticket, TrendingUp, Gift, ChevronRight, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';
import { motion } from 'framer-motion';

const MILESTONES = [
  { friends: 1, discount: '5%', label: 'Scout' },
  { friends: 5, discount: '25%', label: 'Commander' },
  { friends: 10, discount: '50%', label: 'Legend' },
  { friends: 20, discount: '100%', label: 'God Tier' },
];

export default function AffiliateSection() {
  const [friendsCount, setFriendsCount] = useState(3);
  const [isCopied, setIsCopied] = useState(false);
  const { showToast } = useToast();

  const referralLink = "https://crackorigins.com/ref/user_82x91";
  const currentDiscount = friendsCount * 5;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setIsCopied(true);
    showToast("Referral link copied to clipboard!", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <motion.section 
    className={styles.container}
        id="affiliate"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
    >
      <motion.div 
        className={styles.card}
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        {/* Left Side: Info */}
        <div className={styles.infoContent} >
          <div className={styles.header}>
            <motion.span 
                className={styles.badge}
                whileHover={{ scale: 1.1, rotate: 2 }}
            >
                <TrendingUp size={12} /> Affiliate Program
            </motion.span>
            <h2 className={styles.title}>Grow the Tribe, <span className={styles.highlight}>Shrink the Price</span></h2>
            <div className={styles.description}>
              Every comrade you bring to the battlefield earns you a permanent <strong>5% stacking discount</strong>.
              Invite friends, collect power-ups, and unlock your library for free.
            </div>
          </div>

          <div className={styles.referralBox}>
            <div className={styles.linkWrapper}>
              <input
                type="text"
                readOnly
                value={referralLink}
                className={styles.linkInput}
              />
              <motion.button 
                className={styles.copyBtn} 
                onClick={handleCopy}
                whileTap={{ scale: 0.8 }}
              >
                {isCopied ? <Check size={18} color="#4ade80" /> : <Copy size={18} />}
              </motion.button>
            </div>
            <motion.button 
                className={styles.inviteBtn}
                whileHover={{ scale: 1.05, rotate: -1 }}
            >
              <Share2 size={16} /> Share Invite Link
            </motion.button>
          </div>

          <div className={styles.statsRow}>
            {[
                { val: friendsCount, label: "Friends Invited" },
                { val: `${currentDiscount}%`, label: "Current Discount" },
                { val: "$0.00", label: "Total Saved" }
            ].map((stat, i) => (
                <motion.div 
                    key={i} 
                    className={styles.statCard}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 * i }}
                >
                  <span className={styles.statValue}>{stat.val}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Visual Progress */}
        <div className={styles.progressVisual}>
          <div className={styles.progHeader}>
            <h3 className={styles.progTitle}>Milestone Rewards</h3>
            <span className={styles.progSubtitle}>Stack up to 100% OFF</span>
          </div>

          <div className={styles.milestoneList}>
            {MILESTONES.map((m, i) => {
              const isActive = friendsCount >= m.friends;
              return (
                <motion.div 
                    key={i} 
                    className={`${styles.milestoneItem} ${isActive ? styles.activeItem : ''}`}
                    whileHover={{ x: 5, scale: 1.02 }}
                >
                  <div className={styles.iconCircle}>
                    {isActive ? <Check size={16} /> : <Gift size={16} />}
                  </div>
                  <div className={styles.mInfo}>
                    <span className={styles.mLabel}>{m.label}</span>
                    <span className={styles.mDesc}>{m.friends} Friend{m.friends > 1 ? 's' : ''} — <strong>{m.discount} OFF</strong></span>
                  </div>
                  <ChevronRight size={16} />
                </motion.div>
              );
            })}
          </div>

          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBar}>
              <motion.div 
                className={styles.progressFill} 
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, (friendsCount / 20) * 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
              ></motion.div>
            </div>
          </div>

          <motion.button 
            className={styles.applyAllBtn}
            whileHover={{ scale: 1.05, rotate: 1 }}
          >
            <Ticket size={18} /> Apply Combined Discount
          </motion.button>
        </div>
      </motion.div>
    </motion.section>
  );
}
