'use client';
import React, { useState } from 'react';
import styles from './AffiliateSection.module.css';
import { UserPlus, Share2, Ticket, TrendingUp, Gift, ChevronRight, Copy, Check, Users, Trophy, Activity } from 'lucide-react';

import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/contexts/AuthContext';
import { generateAffiliateCoupon, getUserCoupons, getRewardLevels, getUserActivity, getUserAffiliates } from '@/lib/admin-actions';


import Modal from './Modal';

// Removed static MILESTONES as we now use dynamic Affiliate Levels from the database.

export default function AffiliateSection({ affiliateId, friendsCount = 0, xp = 0, onRefresh }: { affiliateId: string | null, friendsCount?: number, xp?: number, onRefresh?: () => void }) {

  const [isCopied, setIsCopied] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(false);

  const { showToast } = useToast();

  React.useEffect(() => {
    getRewardLevels().then(res => {
        if (Array.isArray(res)) {
            setLevels(res);
        }
    });
  }, []);


  const { user, reward_level, affiliateLevelDetails } = useAuth();
  const MILESTONES = levels.map(l => ({
    friends: l.min_xp,
    label: l.title,
    reward: l.onetime_reward_xp,
    commission: l.payment_commision
  }));
  
  const currentXP = xp;
  const nextLevel = levels.find(l => l.min_xp > currentXP);
  const lastLevel = levels.length > 0 ? levels[levels.length - 1] : null;
  const maxXP = nextLevel ? nextLevel.min_xp : (lastLevel ? lastLevel.min_xp : 20);




  const referralLink = affiliateId 
    ? `${window.location.origin}/?ref=${affiliateId}` 
    : "Please login to get your referral link";

  const handleCopy = () => {
    if (!affiliateId) {
        showToast("Please login first!", "error");
        return;
    }
    navigator.clipboard.writeText(referralLink);
    setIsCopied(true);
    showToast("Referral link copied to clipboard!", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Removed discount conversion logic as points are now automatically added to the account balance.

  const handleViewRewards = async () => {
    if (!user) {
        showToast("Please login first!", "error");
        return;
    }
    
    setIsHistoryOpen(true);
    setIsLoadingAffiliates(true);
    try {
        const res = await getUserAffiliates(user.uid);
        if (res.success && res.affiliates) {
            setAffiliates(res.affiliates);
        } else {
            showToast(res.error || "Failed to load affiliates", "error");
        }
    } catch (err) {
        showToast("Error loading affiliate history", "error");
    } finally {
        setIsLoadingAffiliates(false);
    }

  };

  return (
    <motion.section 
    className={styles.container}
        id="affiliates"
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
            <h2 className={styles.title}>Grow the Tribe, <span className={styles.highlight}>Rise the Ranks</span></h2>
            <div className={styles.description}>
              Every comrade you recruit earns you permanent <strong>Affiliate XP</strong>. 
              Climb the ranks, unlock higher commissions, and earn automatic rewards with every milestone.
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
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </motion.button>
            </div>
              <motion.button 
                className={styles.inviteBtn}
                whileHover={{ scale: 1.05, rotate: -1 }}
                onClick={handleViewRewards}
            >
              <Ticket size={16} /> My Rewards History
            </motion.button>
          </div>

          <div className={styles.statsRow}>
            {[
                { val: friendsCount, label: "Comrades Recruited" },
                { val: currentXP, label: "Total Rank XP" },
                { val: reward_level.toUpperCase(), label: "Current Rank" }
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
            <h3 className={styles.progTitle}>Affiliate Ranks</h3>
            <span className={styles.progSubtitle}>Earn up to {levels.length > 0 ? levels[levels.length-1].payment_commision : 0}% Commission</span>
          </div>

          <div className={styles.milestoneList}>
            {MILESTONES.map((m, i) => {
              const isActive = currentXP >= m.friends;
              return (

                <motion.div 
                    key={i} 
                    className={`${styles.milestoneItem} ${isActive ? styles.activeItem : ''}`}
                    whileHover={{ x: 5, scale: 1.02 }}
                >
                <div className={styles.iconCircle}>
                    {isActive ? <Check size={16} /> : <TrendingUp size={16} />}
                  </div>
                  <div className={styles.mInfo}>
                    <span className={styles.mLabel}>{m.label}</span>
                    <span className={styles.mDesc}>{m.friends} XP — <strong>{m.commission}% Commission</strong></span>
                  </div>

                  <ChevronRight size={16} />
                </motion.div>
              );
            })}
          </div>

          <div className={styles.progressBarWrapper}>
            <div className={styles.progressLabels}>
                {MILESTONES.map((m, i) => (
                    <span key={i} className={styles.progLabel} style={{ left: `${(m.friends / maxXP) * 100}%` }}>{m.friends}</span>
                ))}
            </div>

            <div className={styles.progressBar}>
              <motion.div 
                className={styles.progressFill} 
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, (currentXP / maxXP) * 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}

              >
                  <div className={styles.glowEffect}></div>
              </motion.div>
              {MILESTONES.map((m, i) => {
                  const isMarkerActive = currentXP >= m.friends;
                  return (
                    <div 
                        key={i} 
                        className={`${styles.marker} ${isMarkerActive ? styles.activeMarker : ''}`}
                        style={{ 
                            left: `${(m.friends / maxXP) * 100}%`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isMarkerActive && <Check size={8} color="#000" strokeWidth={4} />}
                    </div>
                  );
              })}
            </div>
          </div>

          <div className={styles.xpNotice}>

            <TrendingUp size={16} color="var(--primary)" />
            <span>XP is automatically added to your balance on every successful referral.</span>
          </div>

        </div>
      </motion.div>

      {/* Removed Coupons Modal as discounts are no longer generated */}

      <Modal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        title="My Recruits"
        maxWidth="500px"
      >
        <div className={styles.recruitsList}>
            {isLoadingAffiliates ? (
                <div className={styles.emptyState}>
                    <div className="premiumLoader"><div className="glitchLoader">SYNCING...</div></div>
                    <p>Fetching your recruits...</p>
                </div>
            ) : affiliates.length > 0 ? (
                affiliates.map((item, i) => (
                    <motion.div 
                        key={i} 
                        className={styles.recruitItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div className={styles.recruitAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--outline-color)', borderRadius: '50%', overflow: 'hidden' }}>
                            {item.logo ? (
                                <img src={item.logo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Users size={20} color="var(--primary)" />
                            )}
                        </div>
                        <div className={styles.recruitInfo}>
                            <span className={styles.recruitName}>{item.name}</span>
                            <span className={styles.recruitType}>Joined: {item.joinedAt ? new Date(item.joinedAt).toLocaleDateString('en-GB') : 'N/A'}</span>
                        </div>
                        <div className={styles.recruitXP}>
                            <span className={styles.earnedXP} style={{ color: 'var(--primary)' }}>
                                +{item.rewardXP}
                            </span>
                            <span className={styles.earnedLabel}>XP earned</span>
                        </div>
                    </motion.div>
                ))
            ) : (
                <div className={styles.emptyState}>
                    <Users size={48} className={styles.emptyIcon} />
                    <p>No recruits found yet. Start sharing your referral link!</p>
                </div>
            )}
        </div>
      </Modal>

    </motion.section>
  );
}
