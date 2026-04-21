'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Shield, Clock, CheckCircle2, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, onSnapshot} from "firebase/firestore";
import { fireStore } from "../../lib/firebase";
import { getUserKey, getAffiliateProgress } from '@/lib/admin-actions';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import { useToast } from '../Toast';
import Modal from '../Modal';
import PayPalCheckout from '../../lib/paypal';
import CountdownTimer from '../common/CountdownTimer';
import { getGlobalOffers } from '@/lib/live-actions';
import { revealVariants, staggerContainer, STEAM_SVG, WINDOWS_SVG } from '../../lib/constants';
import styles from '../ExtraSections.module.css';
import carouselStyles from '../GamesCarousel.module.css';
import { Share2 } from 'lucide-react';
import CheckCircle from '../CheckCircle';

interface SteamCardProps {
    game: any;
    user: any;
    affiliateId: string | null;
    purchasedOffers: any;
    showKeys: any;
    decryptedKeys: any;
    isFetchingKey: any;
    handleShowKey: (id: string) => void;
    setSelectedSteamGame: (game: any) => void;
    setModalState: (state: any) => void;
    setOfferPayLock: (lock: any) => void;
}

function SteamCard({ 
    game, 
    user, 
    affiliateId,
    purchasedOffers, 
    showKeys, 
    decryptedKeys, 
    isFetchingKey, 
    handleShowKey, 
    setSelectedSteamGame, 
    setModalState,
    setOfferPayLock 
}: SteamCardProps) {
    const { showToast } = useToast();
    const isFree = parseFloat(game.discountPrice.replace('$', '')) === 0;
    const [accumulatedDiscount, setAccumulatedDiscount] = useState(isFree ? 0 : 100);

    // Track actual affiliates recruited since the offer was listed
    useEffect(() => {
        if (!user?.uid || !isFree || !game.listed) return;

        const listedDate = new Date(game.listed);
        if (isNaN(listedDate.getTime())) return;

        // Fallback to Server Action to avoid Permission Denied on subcollections
        const fetchProgress = async () => {
            try {
                const res = await getAffiliateProgress(user.uid, game.listed);
                if (res.success) {
                    const count = res.count || 0;
                    const target = Number(game.targetAffiliates || 10);
                    const progress = Math.min(100, Math.floor((count / target) * 100));
                    setAccumulatedDiscount(progress);
                }
            } catch (err) {
                console.error("Failed to fetch affiliate progress:", err);
            }
        };

        fetchProgress();
        // Since recruitment is a "slow" event, polling every 2 minutes is sufficient 
        // to keep the UI interactive without hitting permission walls.
        const interval = setInterval(fetchProgress, 120000);

        return () => clearInterval(interval);
    }, [user?.uid, game.id, game.listed, isFree, game.targetAffiliates]);

    const handleCopyAffiliateLink = () => {
        if (!affiliateId) {
            showToast("Login to get your affiliate link!", "error");
            return;
        }
        const link = `${window.location.origin}/?ref=${affiliateId}`;
        navigator.clipboard.writeText(link);
        showToast("Invite link copied! Share it to get recruits.", "success");
    };

    return (
        <motion.div 
            className={`${styles.steamCard} ${isFree ? styles.premiumCard : ''}`} 
            variants={revealVariants}
        >
            <div className={styles.cardImageContainer}>
                <Image 
                    src={game.image} 
                    alt={game.title} 
                    className={styles.cardImage} 
                    width={460} 
                    height={215} 
                    quality={75}
                    loading="lazy"
                />
            </div>
            <div className={styles.platformRow}>
                <div className={styles.platformIcons}>
                    {game.platforms.includes('windows') && (
                        <span className={styles.activeIcon} style={{ display: 'flex' }}>{WINDOWS_SVG}</span>
                    )}
                    <span className={styles.steamTag}>{STEAM_SVG} STEAM</span>
                </div>
                <motion.div className={styles.discountBadge} whileHover={{ scale: 1.1, rotate: 2 }}>{isFree ? 'GIVEAWAY' : game.discount}</motion.div>
            </div>

            <div className={styles.steamInfo}>
                <div className={styles.titleArea}>
                    <h3 className={styles.steamTitle}>{game.title}</h3>
                    <CountdownTimer endTime={game.endTime} />
                </div>

                {!isFree && (
                    <div className={styles.priceContainer}>
                        <span className={styles.priceLabel}>Exclusive Price</span>
                        <div className={styles.priceRow}>
                            <span className={styles.discountPrice}>{game.discountPrice}</span>
                            <span className={styles.originalPrice}>{game.originalPrice}</span>
                        </div>
                        <span className={styles.originalPrice} style={{ textDecoration: "none", color: game.quantity > 0 ? 'inherit' : '#ff4d4d', opacity: 0.5 }}>
                            {game.quantity > 0 ? `${game.quantity} Steam Key${game.quantity === 1 ? '' : 's'} Left` : "Out of Stock"}
                        </span>
                    </div>
                )}

                {isFree && (
                    <div className={styles.discountFillContainer} style={{ marginTop: '0.5rem' }}>
                        <div className={styles.discountFillHeader}>
                            <span className={styles.discountFillLabel}>Recruitment Progress</span>
                            <span className={styles.discountFillValue}>{accumulatedDiscount}%</span>
                        </div>
                        <div className={styles.discountFillBar}>
                            <div className={styles.discountFillProgress} style={{ width: `${accumulatedDiscount}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                                {accumulatedDiscount < 100 ? "Get recruits before it's gone!" : "Goal Reached! Claim now."}
                            </p>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.9 }}>
                                {Math.floor((accumulatedDiscount / 100) * (game.targetAffiliates || 10))} / {game.targetAffiliates || 10}
                            </span>
                        </div>
                    </div>
                )}

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
                                            <button className={styles.btnUnlock} disabled={isFetchingKey[game.id]} onClick={() => handleShowKey(game.id)}>
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
                                            <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid rgba(var(--primary-rgb), 0.2)', color: 'var(--text-muted)' }}>
                                                <ShoppingCart size={16} /> {isExpired ? 'EXPIRED' : 'SOLD OUT'}
                                            </button>
                                        </>
                                    );
                                }

                                if (isFree && accumulatedDiscount < 100) {
                                    return (
                                        <>
                                            <button className={styles.btnUnlock} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', animation: 'timerPulse 1.5s ease-in-out infinite' }} onClick={handleCopyAffiliateLink}>
                                                <Share2 size={16} /> INVITE & CLAIM ({game.quantity} LEFT)
                                            </button>
                                        </>
                                    );
                                }

                                return (
                                    <>
                                        <div className={styles.hiddenKey}>••••••••••</div>
                                        <button className={styles.btnUnlock} onClick={() => { setOfferPayLock('none'); setSelectedSteamGame(game); setModalState('idle'); }}>
                                            <ShoppingCart size={16} /> {isFree ? 'CLAIM FREE' : 'PURCHASE'}
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
    );
}

export default function SteamMarketplace({ showAll = false }: { showAll?: boolean }) {
  const { user, affiliateId } = useAuth();
  const { setIsAuthModalOpen } = useModals();
  const { showToast } = useToast();
  
  const [steamGames, setSteamGames] = useState<any[]>([]);
  const [selectedSteamGame, setSelectedSteamGame] = useState<any | null>(null);
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'success'>('closed');
  const [purchasedOffers, setPurchasedOffers] = useState<{ [key: string]: any }>({});
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [decryptedKeys, setDecryptedKeys] = useState<{ [key: string]: string }>({});
  const [isFetchingKey, setIsFetchingKey] = useState<{ [key: string]: boolean }>({});
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [offerPayLock, setOfferPayLock] = useState<'none' | 'paypal'>('none');

  useEffect(() => {
    if (modalState === 'closed' || modalState === 'success') {
      setOfferPayLock('none');
    }
  }, [modalState]);

  useEffect(() => {
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
            if (!data) return null;

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
              try {
                if (typeof data.expire.toDate === 'function') {
                  endTimeStr = data.expire.toDate().toISOString();
                } else if (data.expire.seconds) {
                    endTimeStr = new Date(data.expire.seconds * 1000).toISOString();
                } else {
                  endTimeStr = new Date(data.expire).toISOString();
                }
              } catch (e) {
                console.warn("Date parsing failed for offer:", d.id, e);
              }
            }

            // Robust Listed Date parsing
            let listedTimeStr = new Date().toISOString();
            if (data.listed) {
                try {
                    if (typeof data.listed.toDate === 'function') {
                        listedTimeStr = data.listed.toDate().toISOString();
                    } else if (data.listed.seconds) {
                        listedTimeStr = new Date(data.listed.seconds * 1000).toISOString();
                    } else {
                        const parsed = new Date(data.listed);
                        if (!isNaN(parsed.getTime())) {
                            listedTimeStr = parsed.toISOString();
                        }
                    }
                } catch (e) {
                    console.warn("Listed date parsing failed for offer:", d.id, e);
                }
            }

            // Extract real Steam App ID from the gameUrl the admin provides
            // e.g. https://store.steampowered.com/app/1234567/GameName/
            const steamAppId = data.gameUrl?.match(/\/app\/(\d+)/)?.[1] || d.id;

            return {
              id: d.id,
              title: data.title || 'Unknown Game',
              originalPrice: `$${originalPrice.toFixed(2)}`,
              discountPrice: `$${discountPrice.toFixed(2)}`,
              discount: (typeof data.discount === 'string' && data.discount.includes('-')) ? data.discount : `-${discountPercent}%`,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`,
              platforms: data.operatingSystem ? [String(data.operatingSystem).toLowerCase()] : ['windows'],
              steamUrl: data.gameUrl || `https://store.steampowered.com/app/${steamAppId}/`,
              endTime: endTimeStr,
              listed: listedTimeStr,
              targetAffiliates: Number(data.targetAffiliates || 10),
              quantity: Number(data.quantity || 0),
            };
          } catch (itemErr) {
            console.error("Error parsing individual offer item:", d.id, itemErr);
            return null;
          }
        }).filter((x): x is any => !!x);

        const filteredSorted = offers
          .filter((game) => {
              if (!game.endTime) return false;
              const expireTime = new Date(game.endTime).getTime();
              return !isNaN(expireTime) && expireTime > Date.now();
          })
          .sort((a, b) => {
            // Giveaways first
            const aIsFree = parseFloat(a.discountPrice.replace('$', '')) === 0;
            const bIsFree = parseFloat(b.discountPrice.replace('$', '')) === 0;
            if (aIsFree && !bIsFree) return -1;
            if (!aIsFree && bIsFree) return 1;

            const aIsOut = a.quantity <= 0;
            const bIsOut = b.quantity <= 0;
            if (aIsOut && !bIsOut) return 1;
            if (!aIsOut && bIsOut) return -1;
            
            const timeA = new Date(a.endTime).getTime();
            const timeB = new Date(b.endTime).getTime();
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeA - timeB;
          });

        if (typeof window !== 'undefined') {
          localStorage.setItem('crack_origins_offers_cache', JSON.stringify(filteredSorted));
        }
        setSteamGames(filteredSorted);
        setIsLoadingOffers(false);
      } catch (err) {
        console.error("Critical error mapping offers: ", err);
        setIsLoadingOffers(false);
      }
    }, async (error) => {
        console.error("Firestore onSnapshot error:", error);
        
        // Fallback to Server Action if client-side listener fails (permission issues)
        const fallbackOffers = await getGlobalOffers();
        if (fallbackOffers && fallbackOffers.length > 0) {
            setSteamGames(fallbackOffers);
            if (typeof window !== 'undefined') {
                localStorage.setItem('crack_origins_offers_cache', JSON.stringify(fallbackOffers));
            }
        } else {
            showToast("Failed to connect to offers database. Please check your connection.", "error");
        }
        setIsLoadingOffers(false);
    });

    return () => unsubOffers();
  }, []);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (user) {
      let paymentsDict: { [key: string]: any } = {};
      let offersDict: { [key: string]: any } = {};

      const updateState = () => {
        setPurchasedOffers({ ...paymentsDict, ...offersDict });
      };

      unsubs.push(onSnapshot(collection(fireStore, 'accounts', user.uid, 'payments'), (snap) => {
        const dict: { [key: string]: any } = {};
        snap.forEach(d => {
          const data = d.data();
          if (data.offerId) dict[data.offerId] = data;
        });
        paymentsDict = dict;
        updateState();
      }));

      unsubs.push(onSnapshot(collection(fireStore, 'accounts', user.uid, 'offers'), (snap) => {
        const dict: { [key: string]: any } = {};
        snap.forEach(d => {
          dict[d.id] = d.data();
        });
        offersDict = dict;
        updateState();
      }));
    } else {
      setPurchasedOffers({});
    }

    return () => { unsubs.forEach(unsub => unsub()); };
  }, [user]);

  const handleShowKey = async (offerId: string) => {
    if (!user) return;
    if (showKeys[offerId]) {
      setShowKeys(prev => ({ ...prev, [offerId]: false }));
      return;
    }
    if (decryptedKeys[offerId]) {
      setShowKeys(prev => ({ ...prev, [offerId]: true }));
      return;
    }
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
    <motion.section
      className={styles.section}
      id="keys"
      initial="hidden"
      animate="visible"
      variants={revealVariants}
    >
      <motion.span className="sectionLabel">Limited Offers</motion.span>
      <h2 className={styles.sectionTitle}>Curated Steam Deals</h2>
      <p className={styles.sectionSubtext}>
        Grab official Steam keys at exclusive studio prices. These offers expire soon.
      </p>

      <motion.div className={styles.steamGrid} variants={staggerContainer}>
        {isLoadingOffers && steamGames.length === 0 ? (
          [1, 2, 3].map((i) => (
             <div key={i} className={`${styles.steamCard} ${styles.skeletonCard} skeletonPremium`}>
                <div className="scanline" />
                <div className={styles.skeletonPlatformRow}>
                  <div className={styles.skeletonRow}></div>
                </div>
             </div>
          ))
        ) : steamGames.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', opacity: 0.7, color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.02)', border: '1px dashed rgba(var(--primary-rgb), 0.15)' }}>No active offers available right now.</div>
        ) : (
          (showAll ? steamGames : steamGames.slice(0, 3)).map((game) => (
            <SteamCard 
                key={game.id} 
                game={game} 
                user={user} 
                affiliateId={affiliateId}
                purchasedOffers={purchasedOffers}
                showKeys={showKeys}
                decryptedKeys={decryptedKeys}
                isFetchingKey={isFetchingKey}
                handleShowKey={handleShowKey}
                setSelectedSteamGame={setSelectedSteamGame}
                setModalState={setModalState}
                setOfferPayLock={setOfferPayLock}
            />
          )))}
      </motion.div>

      {!showAll && steamGames.length > 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <Link href="/offers" className="btnOutline" style={{ padding: '0.75rem 2rem' }}>
            View All Offers
          </Link>
        </div>
      )}

      <Modal isOpen={modalState !== 'closed'} onClose={() => setModalState('closed')} maxWidth="500px">
        {modalState === 'idle' && selectedSteamGame ? (
          <div className={carouselStyles.checkoutModal} style={{ paddingTop: 0 }}>
            <div className={carouselStyles.modalHeader}>
              <Image src={selectedSteamGame.image} className={carouselStyles.modalPreviewImg} alt="preview" width={80} height={80} quality={75} style={{ objectFit: 'cover' }} />
              <div className={carouselStyles.modalHeaderInfo}>
                <span className={carouselStyles.gameTitle}>{selectedSteamGame.title}</span>
                <span className={carouselStyles.gamePrice}>{selectedSteamGame.discountPrice}</span>
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
              <div className={styles.noticeIcon}><Shield size={18} /></div>
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
                  <div onClick={() => setAcceptedTerms(!acceptedTerms)} style={{ 
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', width: '100%', padding: '0.75rem', 
                    border: acceptedTerms ? '1px solid var(--primary)' : '1px solid rgba(var(--primary-rgb, 254, 182, 12), 0.2)', 
                    background: acceptedTerms ? 'rgba(var(--primary-rgb, 254, 182, 12), 0.05)' : 'transparent',
                    textAlign: 'left' 
                  }}>
                    <CheckCircle checked={acceptedTerms} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>
                      I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link> for this purchase.
                    </span>
                  </div>
                  {acceptedTerms ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                        {/* Money Section */}
                        <div style={{ 
                          background: 'rgba(var(--primary-rgb, 254, 182, 12), 0.03)', 
                          padding: '1.25rem', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(var(--primary-rgb, 254, 182, 12), 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Secure Card / PayPal</h4>
                          </div>

                            <PayPalCheckout
                              amount={selectedSteamGame.discountPrice.replace(/[^0-9.]/g, '')}
                              game={selectedSteamGame.title}
                              gameId={Number(selectedSteamGame.id)}
                              offerId={selectedSteamGame.id}
                              onSuccess={async () => { setModalState('success'); }}
                              onPaymentActivityChange={(active) => {
                                setOfferPayLock(active ? 'paypal' : 'none');
                              }}
                            />
                        </div>
                      </div>
                  ) : (
                    <button className="btnSolid" disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>Accept Terms to Buy</button>
                  )}
                </div>
              ) : (
                <button className="btnSolid" onClick={() => setIsAuthModalOpen(true)} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', width: "100%", justifyContent: 'center' }}>
                  <UserIcon size={14} /> <span className={carouselStyles.connectText}>Connect Google</span>
                </button>
              )}
            </div>
          </div>
        ) : modalState === 'success' ? (
          <div className={carouselStyles.successState}>
            <div className={carouselStyles.successIcon}><CheckCircle2 size={32} /></div>
            <h2 className={carouselStyles.modalTitle}>Purchase Confirmed</h2>
            <p className={carouselStyles.modalText}>After purchasing this game key, our team will verify your payment several times to ensure security. Once the verification process is completed, the key will appear on this game card. Click the Show Key button to reveal your key.</p>
            <button className="btnSolid" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={() => setModalState('closed')}>Return to Store</button>
          </div>
        ) : null}
      </Modal>
    </motion.section>
  );
}
