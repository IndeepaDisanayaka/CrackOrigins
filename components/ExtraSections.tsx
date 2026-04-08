'use client';
import React, { useState } from 'react';
import styles from './ExtraSections.module.css';
import { Mail, ArrowRight, Heart, Globe, Zap, DollarSign, TrendingUp, Shield, UserPlus, Briefcase, Code, Trophy, Monitor, Apple, Clock, Eye, ShoppingCart, CheckCircle2, User, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';
import Modal from './Modal';
import Checkout from '@/lib/paypal';
import { auth, fireStore } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, getDocs, query, where } from "firebase/firestore";
import { getUserKey } from '@/lib/admin-actions';
import { login } from '@/app/page';
import { useSearchParams } from 'next/navigation';
import { useToast } from './Toast';
import carouselStyles from './GamesCarousel.module.css';
import AuthModal from './AuthModal';


import { motion } from 'framer-motion';

const YOUTUBE_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
);

const INSTAGRAM_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const DISCORD_SVG = (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5485-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
  </svg>
);

const STEAM_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.001 0a12 12 0 0 0-12 12 12 12 0 0 0 12 12 11.96 11.96 0 0 0 7.37-2.541l-5.613-2.316a3.543 3.543 0 0 1-5.617-2.327L1.8 17.51a11.932 11.932 0 0 0 .584 3.73l5.807-2.428a3.535 3.535 0 0 1 1.458-2.61l.011-.008c.203-.131.424-.225.656-.279l1.458-.613c.1-.035.21-.06.326-.076L11.531 10.1c-.015-.132-.015-.265-.015-.4 0-4.417 3.582-8 8-8s8 3.583 8 8-3.582 8-8 8c-.417 0-.825-.033-1.22-.098l-3.328 8.01a12.003 12.003 0 0 0 9.033-11.512c0-6.627-5.373-12-12-12zM19.516 6.1a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
  </svg>
);

const WINDOWS_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1l.01 9.45H0v-9.45zM0 12.6h9.75v9.45L0 20.551v-7.951zm10.949-10.5L24 0v11.4h-13.051V2.1zm13.051 10.5V24l-13.051-1.852V12.6h13.051z" />
  </svg>
);

const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0, ms: 0 });

  React.useEffect(() => {
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
};


const VALUES = [
  { icon: <Heart size={22} />, title: 'Player First', description: 'Every design decision starts with the player experience.' },
  { icon: <Zap size={22} />, title: 'Innovation', description: 'We push boundaries with creative mechanics and fresh ideas.' },
  { icon: <Globe size={22} />, title: 'Community', description: 'Our players are part of the development journey from day one.' },
];

const INVEST_PERKS = [
  { icon: <TrendingUp size={24} />, title: 'Growing Market', desc: 'The indie gaming industry is projected to reach $30B by 2028.' },
  { icon: <Shield size={24} />, title: 'Proven Track Record', desc: '4 successful releases with 20k+ combined active players.' },
  { icon: <DollarSign size={24} />, title: 'Revenue Sharing', desc: 'Investors receive proportional revenue share across all titles.' },
];

const JOIN_ROLES = [
  { icon: <Code size={22} />, title: 'Game Developer', type: 'Full-time · Remote', desc: 'Build gameplay systems and core engine features.' },
  { icon: <Briefcase size={22} />, title: 'UI/UX Designer', type: 'Full-time · Remote', desc: 'Design intuitive interfaces for immersive gaming experiences.' },
  { icon: <UserPlus size={22} />, title: 'Community Manager', type: 'Part-time · Remote', desc: 'Manage Discord, social media, and player engagement.' },
];

const revealVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export default function ExtraSections() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [steamGames, setSteamGames] = useState<any[]>([]);
  const [selectedSteamGame, setSelectedSteamGame] = useState<any | null>(null);
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'success'>('closed');
  const [user, setUser] = useState<any>(null);
  const [purchasedOffers, setPurchasedOffers] = useState<{ [key: string]: any }>({});
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [decryptedKeys, setDecryptedKeys] = useState<{ [key: string]: string }>({});
  const [isFetchingKey, setIsFetchingKey] = useState<{ [key: string]: boolean }>({});
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);


  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('crack_origins_offers_cache');
      if (cached) {
        try {
          setSteamGames(JSON.parse(cached));
          setIsLoadingOffers(false);
        } catch (e) { }
      }
    }

    const unsubOffers = onSnapshot(collection(fireStore, 'offers'), (snap) => {
      try {
        const offers = snap.docs.map(d => {
          try {
            const data = d.data();
            let discountPercent = 0;
            if (typeof data.discount === 'string') {
              discountPercent = Number(data.discount.replace('%', '').replace('-', ''));
            } else if (typeof data.discount === 'number') {
              discountPercent = data.discount;
            }
            const originalPrice = Number(data.originalPrice || 0);
            const discountPrice = isNaN(discountPercent) ? originalPrice : originalPrice - (originalPrice * discountPercent / 100);

            let endTimeStr = new Date(Date.now() + 86400000).toISOString();
            if (data.expire) {
              if (typeof data.expire.toDate === 'function') {
                endTimeStr = data.expire.toDate().toISOString();
              } else {
                endTimeStr = new Date(data.expire).toISOString();
              }
            }

            return {
              id: d.id,
              title: data.title || 'Unknown Game',
              originalPrice: `$${originalPrice.toFixed(2)}`,
              discountPrice: `$${discountPrice.toFixed(2)}`,
              discount: (typeof data.discount === 'string' && data.discount.includes('-')) ? data.discount : `-${discountPercent}%`,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${d.id}/header.jpg`,
              platforms: data.operatingSystem ? [data.operatingSystem.toLowerCase()] : ['windows'],
              steamUrl: `https://store.steampowered.com/app/${d.id}/`,
              endTime: endTimeStr,
              quantity: Number(data.quantity || 0),
            };
          } catch (itemErr) {
            console.error("Error parsing offer item:", d.id, itemErr);
            return null;
          }
        }).filter((x): x is any => !!x);

        const filteredSorted = offers
          .filter((game) => {
            return new Date(game.endTime).getTime() > Date.now();
          })
          .sort((a, b) => {
            const aIsOut = a.quantity <= 0;
            const bIsOut = b.quantity <= 0;
            // Sold out at the bottom
            if (aIsOut && !bIsOut) return 1;
            if (!aIsOut && bIsOut) return -1;
            // Soonest first
            return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
          });

        if (typeof window !== 'undefined') {
          localStorage.setItem('crack_origins_offers_cache', JSON.stringify(filteredSorted));
        }
        setSteamGames(filteredSorted);
        setIsLoadingOffers(false);
      } catch (err) {
        console.error("Error setting offers: ", err);
        setIsLoadingOffers(false);
      }
    }, (error) => {
      console.error("Offers snapshot error:", error);
      setIsLoadingOffers(false);
    });

    let unsubs: (() => void)[] = [];
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // Clear previous unsubs
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (u) {
        let paymentsDict: { [key: string]: any } = {};
        let offersDict: { [key: string]: any } = {};

        const updateState = () => {
          setPurchasedOffers({ ...paymentsDict, ...offersDict });
        };

        // Listen to regular payments subcollection (for legacy offers)
        unsubs.push(onSnapshot(collection(fireStore, 'accounts', u.uid, 'payments'), (snap) => {
          const dict: { [key: string]: any } = {};
          snap.forEach(d => {
            const data = d.data();
            if (data.offerId) dict[data.offerId] = data;
          });
          paymentsDict = dict;
          updateState();
        }, (error) => console.error("Payments snapshot error:", error)));

        // Listen to new offers subcollection
        unsubs.push(onSnapshot(collection(fireStore, 'accounts', u.uid, 'offers'), (snap) => {
          const dict: { [key: string]: any } = {};
          snap.forEach(d => {
            dict[d.id] = d.data();
          });
          offersDict = dict;
          updateState();
        }, (error) => console.error("Offers snapshot error:", error)));
      } else {
        setPurchasedOffers({});
      }
    });

    return () => {
      unsubAuth();
      unsubs.forEach(unsub => unsub());
      unsubOffers();
    };
  }, []);

  const handleShowKey = async (offerId: string) => {
    if (!user) return;

    // Toggle off if already showing
    if (showKeys[offerId]) {
      setShowKeys(prev => ({ ...prev, [offerId]: false }));
      return;
    }

    // If already decrypted once, just show it
    if (decryptedKeys[offerId]) {
      setShowKeys(prev => ({ ...prev, [offerId]: true }));
      return;
    }

    // Fetch and decrypt
    setIsFetchingKey(prev => ({ ...prev, [offerId]: true }));
    try {
      const res = await getUserKey(user.uid, offerId);
      if (res.success && res.steamKey) {
        setDecryptedKeys(prev => ({ ...prev, [offerId]: res.steamKey! }));
        setShowKeys(prev => ({ ...prev, [offerId]: true }));
      } else {
        showToast(res.error || "Failed to retrieve key.", "error");
      }
    } catch (e) {
      showToast("Verification failed.", "error");
    } finally {
      setIsFetchingKey(prev => ({ ...prev, [offerId]: false }));
    }
  };

  return (
    <div className={styles.container}>

      {/* Steam Game Keys Marketplace */}
      <motion.section
        className={styles.section}
        id="Keys"
        initial="hidden"
        animate="visible"
        variants={revealVariants}
      >
        <motion.span
          className="sectionLabel"
        >
          Limited Offers
        </motion.span>
        <h2 className={styles.sectionTitle}>Curated Steam Deals</h2>
        <p className={styles.sectionSubtext}>
          Grab official Steam keys at exclusive studio prices. These offers expire soon.
        </p>

        <motion.div
          className={styles.steamGrid}
          variants={staggerContainer}
        >
          {isLoadingOffers && steamGames.length === 0 ? (
            [1, 2, 3].map((i) => (
              <div key={i} className={`${styles.steamCard} ${styles.skeletonCard}`}>
                {/* Platform row skeleton */}
                <div className={styles.skeletonPlatformRow}>
                  <div className={styles.skeletonRow}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonIcon}`}></div>
                    <div className={styles.skeletonDivider}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTagBlock}`}></div>
                  </div>
                  <div className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}></div>
                </div>

                <div className={styles.skeletonBody}>
                  {/* Title skeleton */}
                  <div className={styles.skeletonTitleArea}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTitleShort}`}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTimer}`}></div>
                  </div>

                  {/* Price skeleton */}
                  <div className={styles.skeletonPriceArea}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonPriceLabel}`}></div>
                    <div className={styles.skeletonRow}>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonBigPrice}`}></div>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonOldPrice}`}></div>
                    </div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonNote}`}></div>
                  </div>

                  {/* Actions skeleton */}
                  <div className={styles.skeletonActions}>
                    <div className={styles.skeletonRow} style={{ gap: '0.5rem' }}>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonKeyInput}`}></div>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonBtn}`}></div>
                    </div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonBtnFull}`}></div>
                  </div>
                </div>
              </div>
            ))
          ) : steamGames.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', opacity: 0.7 }}>No active offers available right now.</div>
          ) : (
            steamGames.map((game) => (
              <motion.div key={game.id} className={styles.steamCard} variants={revealVariants}>
                <img src={game.image} alt={game.title} className={styles.cardImage} />
                <div className={styles.platformRow}>
                  <div className={styles.platformIcons}>
                    {game.platforms.includes('windows') && (
                      <span className={styles.activeIcon} style={{ display: 'flex' }}>{WINDOWS_SVG}</span>
                    )}
                    <span className={styles.steamTag}>{STEAM_SVG} STEAM</span>
                  </div>
                  <motion.div
                    className={styles.discountBadge}
                    whileHover={{ scale: 1.1, rotate: 2 }}
                  >
                    {game.discount}
                  </motion.div>
                </div>

                <div className={styles.steamInfo}>
                  <div className={styles.titleArea}>
                    <h3 className={styles.steamTitle}>
                      {game.title}
                    </h3>
                    <CountdownTimer endTime={game.endTime} />
                  </div>

                  <div className={styles.priceContainer}>
                    <span className={styles.priceLabel}>Exclusive Price</span>
                    <div className={styles.priceRow}>
                      <span className={styles.discountPrice}>{game.discountPrice}</span>
                      <span className={styles.originalPrice}>{game.originalPrice}</span>
                    </div>
                    <span className={styles.originalPrice} style={{ textDecoration: "none", color: game.quantity > 0 ? 'inherit' : '#ff4d4d' }}>
                      {game.quantity > 0 ? `${game.quantity} Steam Key${game.quantity === 1 ? '' : 's'} Left` : "Out of Stock"}
                    </span>
                  </div>

                  <div className={styles.steamActions}>
                    <div className={styles.keyContainer}>
                      {(() => {
                        const purchasedOffer = purchasedOffers[game.id];
                        const hasPurchased = !!purchasedOffer;
                        if (hasPurchased) {
                          if (purchasedOffer.steamKey) {
                            return (
                              <>
                                <div className={styles.hiddenKey}>{showKeys[game.id] ? (decryptedKeys[game.id] || 'Retrieving...') : '••••••••••'}</div>
                                <button
                                  className={styles.btnUnlock}
                                  disabled={isFetchingKey[game.id]}
                                  onClick={() => handleShowKey(game.id)}
                                >
                                  {isFetchingKey[game.id] ? 'WAIT...' : (showKeys[game.id] ? 'HIDE' : 'SHOW')}
                                </button>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className={styles.hiddenKey} style={{ fontSize: '0.8rem' }}>PENDING VERIFICATION</div>
                                <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                  <Clock size={16} /> PENDING
                                </button>
                              </>
                            );
                          }
                        } else {
                          const isExpired = new Date(game.endTime).getTime() < Date.now();
                          const isOutOfStock = game.quantity <= 0;

                          if (isExpired || isOutOfStock) {
                            return (
                              <>
                                <div className={styles.hiddenKey}>••••••••••</div>
                                <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: '#ccc' }}>
                                  <ShoppingCart size={16} /> {isExpired ? 'EXPIRED' : 'SOLD OUT'}
                                </button>
                              </>
                            );
                          }

                          return (
                            <>
                              <div className={styles.hiddenKey}>••••••••••</div>
                              <button className={styles.btnUnlock} onClick={() => { setSelectedSteamGame(game); setModalState('idle'); }}>
                                <ShoppingCart size={16} /> PURCHASE
                              </button>
                            </>
                          );
                        }
                      })()}
                    </div>
                    <a href={game.steamUrl} target="_blank" rel="noopener noreferrer" className="btnOutline" style={{ width: '100%', textAlign: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      View on Steam
                    </a>
                  </div>
                </div>
              </motion.div>
            )))}
        </motion.div>

        {/* Purchase Modal - Matching GamesCarousel */}
        <Modal isOpen={modalState !== 'closed'} onClose={() => setModalState('closed')} maxWidth="500px">
          {modalState === 'idle' && selectedSteamGame ? (
            <div className={carouselStyles.checkoutModal} style={{ paddingTop: 0 }}>
              <div className={carouselStyles.modalHeader}>
                <img src={selectedSteamGame.image} className={carouselStyles.modalPreviewImg} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                <div className={carouselStyles.modalHeaderInfo}>
                  <span className={carouselStyles.gameTitle}>{selectedSteamGame.title}</span>
                  <span className={carouselStyles.gamePrice}>
                    {selectedSteamGame.discountPrice}
                  </span>
                </div>
              </div>

              <div className={carouselStyles.requirementsSection}>
                <div className={carouselStyles.reqBlock}>
                  <span className={carouselStyles.reqLabel}>Promotion Details</span>
                  <p className={carouselStyles.reqText}>Original Price: {selectedSteamGame.originalPrice}</p>
                </div>
                <div className={carouselStyles.reqBlock}>
                  <span className={carouselStyles.reqLabel}>Platform</span>
                  <p className={carouselStyles.reqText}>Steam Key ({selectedSteamGame.platforms.join(', ')})</p>
                </div>
              </div>

              <div className={styles.importantNotice}>
                <div className={styles.noticeIcon}>
                  <Shield size={18} />
                </div>
                <div className={styles.noticeContent}>
                  <h4 className={styles.noticeTitle}>Important Note</h4>
                  <p className={styles.noticeText}>
              After purchasing this game key, our team will verify your payment several times to ensure security. Once the verification process is completed, the key will appear on this game card. Click the Show Key button to reveal your key.
                  </p>
                </div>
              </div>

              <div className={carouselStyles.modalFooter}>
                {user ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                    <div 
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      style={{ 
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', 
                        width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ color: acceptedTerms ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {acceptedTerms ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>
                        I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link> for this purchase.
                      </span>
                    </div>
                    {acceptedTerms ? (
                      <Checkout
                        amount={selectedSteamGame.discountPrice}
                        game={selectedSteamGame.title}
                        isOwned={false}
                        offerId={selectedSteamGame.id}
                        onSuccess={async () => {
                          setModalState('success');
                        }}
                      />
                    ) : (
                      <button className="btnSolid" disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
                        Accept Terms to Buy
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="btnSolid"
                    onClick={() => setIsAuthModalOpen(true)}
                    style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', width: "100%", justifyContent: 'center' }}>
                    <User size={14} /> <span className={carouselStyles.connectText}>Connect Google</span>
                  </button>
                )}
              </div>
            </div>
          ) : modalState === 'success' ? (
            <div className={carouselStyles.successState}>
              <div className={carouselStyles.successIcon}>
                <CheckCircle2 size={32} />
              </div>
              <h2 className={carouselStyles.modalTitle}>Purchase Confirmed</h2>
              <p className={carouselStyles.modalText}>After purchasing this game key, our team will verify your payment several times to ensure security. Once the verification process is completed, the key will appear on this game card. Click the Show Key button to reveal your key.</p>
              <button className="btnSolid" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={() => setModalState('closed')}>
                Return to Store
              </button>
            </div>
          ) : null}
        </Modal>

      </motion.section>

      {/* About Section - Modernized */}
      <motion.section
        className={styles.section}
        id="about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <div className={styles.aboutGrid}>
          {/* Left: Visual/Mission */}
          <div className={styles.aboutVisual}>
            <div className={styles.aboutCard}>
              <div className={styles.aboutCardBg}></div>
              <span className="sectionLabel">Our Creed</span>
              <h2 className={styles.aboutHeroTitle}>Unique Creation.<br /><span>CO's Vision.</span></h2>
              <p className={styles.aboutHeroDesc}>
                We believe in the power of the community. Our mission is to build a platform that discovers unique ideas to craft the next best gaming experience.
              </p>
              <div className={styles.aboutStats}>
                <div className={styles.aboutStatItem}>
                  <span className={styles.aboutStatVal}>2025</span>
                  <span className={styles.aboutStatLabel}>Est. Year</span>
                </div>
                <div className={styles.aboutStatItem}>
                  <span className={styles.aboutStatVal}>4+</span>
                  <span className={styles.aboutStatLabel}>Creators</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Detailed Text & Values */}
          <div className={styles.aboutDetails}>
            <span className="sectionLabel">Who We Are</span>
            <h2 className={styles.sectionTitle}>The Hero Rebuilding.</h2>
            <p className={styles.aboutText}>
              Crack Origins is born from the legend of a hero paralyzed by a curse, yet he is not dead. His power is rebuilding. This story mirrors our team: an indie collective dedicated to turning a massive page in gaming history by forging unique paths that major studios often overlook.
            </p>
            <div className={styles.aboutValuesList}>
              {VALUES.map((val, i) => (
                <motion.div key={i} className={styles.valueRow} variants={revealVariants}>
                  <div className={styles.valueIconSmall}>{val.icon}</div>
                  <div className={styles.valueContent}>
                    <h3 className={styles.valueTitleSmall}>{val.title}</h3>
                    <p className={styles.valueDescSmall}>{val.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>



      {/* Invest In Our Games */}
      <motion.section
        className={styles.section}
        id="invest"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Opportunity</span>
        <h2 className={styles.sectionTitle}>Invest In Our Games</h2>
        <p className={styles.sectionSubtext}>
          Back the next generation of indie games. Join our investor program and grow with us.
        </p>
        <motion.div
          className={styles.investGrid}
          variants={staggerContainer}
        >
          {INVEST_PERKS.map((perk, i) => (
            <motion.div key={i} className={styles.investCard} variants={revealVariants}>
              <div className={styles.investIcon}>{perk.icon}</div>
              <h3 className={styles.investTitle}>{perk.title}</h3>
              <p className={styles.investDesc}>{perk.desc}</p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div className={styles.investCta} variants={revealVariants}>
          <button className="btnSolid">
           This feature is not yet available. <ArrowRight size={16} />
          </button>
        </motion.div>
      </motion.section>

      {/* Join With Us */}
      <motion.section
        className={styles.section}
        id="join"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={revealVariants}
      >
        <span className="sectionLabel">Careers</span>
        <h2 className={styles.sectionTitle}>Join With Us</h2>
        <p className={styles.sectionSubtext}>
          We&apos;re looking for talented individuals who share our passion for creating exceptional games.
        </p>
        <motion.div
          className={styles.rolesGrid}
          variants={staggerContainer}
        >
          {JOIN_ROLES.map((role, i) => (
            <motion.div key={i} className={styles.roleCard} variants={revealVariants}>
              <div className={styles.roleHeader}>
                <div className={styles.roleIcon}>{role.icon}</div>
                <div>
                  <h3 className={styles.roleTitle}>{role.title}</h3>
                  <span className={styles.roleType}>{role.type}</span>
                </div>
              </div>
              <p className={styles.roleDesc}>{role.desc}</p>
              <div>
                <button className="btnOutline">Apply Now <ArrowRight size={14} /></button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>



      {/* Socials + Contact */}
      <div className={styles.bottomWrapper}>
        <motion.section
          className={styles.section}
          id="teams"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={revealVariants}
        >
          <span className="sectionLabel">Stay Connected</span>
          <h2 className={styles.sectionTitle}>Join the Community</h2>
          <motion.div className={styles.socialsGrid} variants={staggerContainer}>
            <motion.a href="https://www.youtube.com/@crackorigins" target='_blank' className={styles.socialCard} variants={revealVariants}>
              {YOUTUBE_SVG}
              <span className={styles.socialName}>YouTube</span>
              <span className={styles.socialHandle}>@crackorigins</span>
            </motion.a>
            <motion.a href="https://www.instagram.com/indeepadisanayaka?igsh=MTQ4ZWY0bWozMXp5bg%3D%3D&utm_source=qr" target='_blank' className={styles.socialCard} variants={revealVariants}>
              {INSTAGRAM_SVG}
              <span className={styles.socialName}>Instagram</span>
              <span className={styles.socialHandle}>@indeepadisanayaka</span>
            </motion.a>
            <motion.a href="https://discord.gg/qsAWD52yNc" target='_blank' className={`${styles.socialCard} ${styles.discordCard}`} variants={revealVariants}>
              {DISCORD_SVG}
              <span className={styles.socialName}>Discord</span>
              <span className={styles.socialHandle}>Join 2k+ members</span>
            </motion.a>
          </motion.div>
        </motion.section>

        <motion.section
          className={styles.section}
          id="contact"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={revealVariants}
        >
          <span className="sectionLabel">Let&apos;s Talk</span>
          <h2 className={styles.sectionTitle}>Work With Us</h2>
          <div className={styles.contactCard}>
            <p className={styles.contactDesc}>
              Whether you&apos;re a publisher, creator, or fellow developer — we&apos;re always open to pushing boundaries together.
            </p>
            <div className={`${styles.subscribeRow} animateText animateText5`} style={{display:"flex"}}>
              <input type="email" placeholder="Enter your email for updates" className={styles.emailInput} />
              <button className="btnSolid" style={{ padding: '0 1.5rem', fontSize: '0.75rem' }}>
                <Mail size={14} /> Get in Touch
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLogin={async () => {
          let country = "Unknown";
          try {
            const lRes = await fetch("https://ipapi.co/json/");
            const lData = await lRes.json();
            country = lData.country_name || "Unknown";
          } catch (e) { }
          login(searchParams?.get('ref') || null, country);
        }} 
      />
    </div>
  );
}
