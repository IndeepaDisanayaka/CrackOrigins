'use client';
import React, { useState } from 'react';
import styles from './AffiliateSection.module.css';
import { UserPlus, Share2, Ticket, TrendingUp, Gift, ChevronRight, Copy, Check } from 'lucide-react';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { generateAffiliateCoupon, getUserCoupons } from '@/lib/admin-actions';
import { auth } from '@/lib/firebase';
import Modal from './Modal';

const MILESTONES = [
  { friends: 1, discount: '5%', label: 'Scout' },
  { friends: 5, discount: '25%', label: 'Commander' },
  { friends: 10, discount: '50%', label: 'Legend' },
  { friends: 20, discount: '100%', label: 'God Tier' },
];

export default function AffiliateSection({ affiliateId, friendsCount = 0, discount = 0, onRefresh }: { affiliateId: string | null, friendsCount?: number, discount?: number, onRefresh?: () => void }) {
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCouponsModalOpen, setIsCouponsModalOpen] = useState(false);
  const [userCoupons, setUserCoupons] = useState<any[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdTimer, setHoldTimer] = useState<NodeJS.Timeout | null>(null);
  const { showToast } = useToast();

  const referralLink = affiliateId 
    ? `${window.location.origin}/?ref=${affiliateId}` 
    : "Please login to get your referral link";
  const currentDiscount = discount;

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

  const handleGenerateCoupon = async () => {
    if (!auth.currentUser) {
        showToast("Please login first!", "error");
        return;
    }
    if (discount <= 0) {
        showToast("You don't have any discount to apply.", "error");
        return;
    }

    setIsGenerating(true);
    try {
        const res = await generateAffiliateCoupon(auth.currentUser.uid);
        if (res.success) {
            showToast(`Success! Your coupon code: ${res.couponCode}`, "success");
            if (onRefresh) onRefresh();
        } else {
            showToast(res.error || "Failed to generate coupon.", "error");
        }
    } catch (err) {
        showToast("Error processing request.", "error");
    } finally {
        setIsGenerating(false);
        setHoldProgress(0);
    }
  };

  const startHold = () => {
    if (isGenerating || discount <= 0) return;
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 2; // 2% every 100ms = 5 seconds total
        setHoldProgress(progress);
        
        if (progress >= 100) {
            clearInterval(interval);
            setHoldTimer(null);
            handleGenerateCoupon();
        }
    }, 100);
    setHoldTimer(interval);
  };

  const stopHold = () => {
    if (holdTimer) {
        clearInterval(holdTimer);
        setHoldTimer(null);
        if (holdProgress < 100) {
            setHoldProgress(0);
        }
    }
  };

  const handleViewCoupons = async () => {
    if (!auth.currentUser) {
        showToast("Please login first!", "error");
        return;
    }
    try {
        const res = await getUserCoupons(auth.currentUser.uid);
        if (res.success) {
            setUserCoupons(res.coupons || []);
            setIsCouponsModalOpen(true);
        } else {
            showToast(res.error || "Failed to fetch coupons.", "error");
        }
    } catch (err: any) {
        console.error("DEBUG FETCH:", err);
        showToast("Error processing request.", "error");
    }
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
                {isCopied ? <Check size={18} /> : <Copy size={18} />}
              </motion.button>
            </div>
            <motion.button 
                className={styles.inviteBtn}
                whileHover={{ scale: 1.05, rotate: -1 }}
                onClick={handleViewCoupons}
            >
              <Ticket size={16} /> My Rewards History
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
            <div className={styles.progressLabels}>
                {MILESTONES.map((m, i) => (
                    <span key={i} className={styles.progLabel} style={{ left: `${(m.friends / 20) * 100}%` }}>{m.friends}</span>
                ))}
            </div>
            <div className={styles.progressBar}>
              <motion.div 
                className={styles.progressFill} 
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, (friendsCount / 20) * 100)}%` }}
                transition={{ duration: 1.5, ease: "circOut" }}
              >
                  <div className={styles.glowEffect}></div>
              </motion.div>
              {MILESTONES.map((m, i) => (
                  <div 
                    key={i} 
                    className={`${styles.marker} ${friendsCount >= m.friends ? styles.activeMarker : ''}`}
                    style={{ left: `${(m.friends / 20) * 100}%` }}
                  ></div>
              ))}
            </div>
          </div>

          <motion.button 
            className={styles.applyAllBtn}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isGenerating || discount <= 0}
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={startHold}
            onTouchEnd={stopHold}
          >
            <div className={styles.buttonHoldFill} style={{ width: `${holdProgress}%` }}></div>
            <div className={styles.buttonText}>
                {isGenerating ? "Processing..." : holdProgress > 0 ? `Hold to Apply... ${Math.ceil((100 - holdProgress) / 20)}s` : <><Ticket size={18} /> Apply Combined Discount ({discount}%)</>}
            </div>
          </motion.button>
        </div>
      </motion.div>

      {/* Coupons View Modal */}
      <Modal isOpen={isCouponsModalOpen} onClose={() => setIsCouponsModalOpen(false)} title="My Reward Coupons">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
            {userCoupons.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                    No coupons generated yet. Invite friends to earn discounts!
                </div>
            ) : (
                userCoupons.map((c, i) => {
                    const expireDate = new Date(c.expire);
                    if (c.expire.length <= 10) expireDate.setHours(23, 59, 59, 999);
                    const isExpired = expireDate < new Date();
                    const isUsed = c.quantity <= 0;

                    return (
                        <div key={i} className={`${styles.couponDetailCard} ${(isExpired || isUsed) ? styles.dimmedCoupon : ''}`}>
                            <div className={styles.couponInfo}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className={styles.couponName}>{c.name}</span>
                                    {isUsed && <span className={styles.statusBadge_used}>Used</span>}
                                    {isExpired && !isUsed && <span className={styles.statusBadge_expired}>Expired</span>}
                                </div>
                                <span className={styles.couponExpire}>Expires: {c.expire}</span>
                            </div>
                            <div className={styles.couponAction}>
                                <span className={styles.couponCodeText}>{c.code}</span>
                                <button className={styles.miniCopy} onClick={() => { navigator.clipboard.writeText(c.code); showToast("Copied!", "success"); }}>
                                    <Copy size={12} />
                                </button>
                            </div>
                            <div className={styles.couponBadge}>{c.discount}</div>
                        </div>
                    );
                })
            )}
        </div>
      </Modal>
    </motion.section>
  );
}
