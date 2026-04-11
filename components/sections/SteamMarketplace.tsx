'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Shield, Clock, CheckCircle2, CheckSquare, Square, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { collection, onSnapshot } from "firebase/firestore";
import { fireStore } from "../../lib/firebase";
import { getUserKey } from '@/lib/admin-actions';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import { useToast } from '../Toast';
import Modal from '../Modal';
import Web3Checkout from '../Web3Checkout';
import PayPalCheckout from '../../lib/paypal';
import LemonSqueezyOfferCheckout from '../LemonSqueezyOfferCheckout';
import CountdownTimer from '../common/CountdownTimer';
import { revealVariants, staggerContainer, STEAM_SVG, WINDOWS_SVG } from '../../lib/constants';
import styles from '../ExtraSections.module.css';
import carouselStyles from '../GamesCarousel.module.css';

export default function SteamMarketplace() {
  const { user, login, country } = useAuth();
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
  /** One active path at a time: card checkout started vs crypto in wallet */
  const [offerPayLock, setOfferPayLock] = useState<'none' | 'lemon' | 'web3'>('none');

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
              lemonVariantId:
                data.lemonVariantId != null && String(data.lemonVariantId).trim() !== ''
                  ? String(data.lemonVariantId).trim()
                  : '',
            };
          } catch (itemErr) {
            console.error("Error parsing offer item:", d.id, itemErr);
            return null;
          }
        }).filter((x): x is any => !!x);

        const filteredSorted = offers
          .filter((game) => new Date(game.endTime).getTime() > Date.now())
          .sort((a, b) => {
            const aIsOut = a.quantity <= 0;
            const bIsOut = b.quantity <= 0;
            if (aIsOut && !bIsOut) return 1;
            if (!aIsOut && bIsOut) return -1;
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
      id="Keys"
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
                  <div className={styles.skeletonRow}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonIcon}`}></div>
                    <div className={styles.skeletonDivider}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTagBlock}`}></div>
                  </div>
                  <div className={`${styles.skeletonBlock} ${styles.skeletonBadge}`}></div>
                </div>
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonTitleArea}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTitleShort}`}></div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonTimer}`}></div>
                  </div>
                  <div className={styles.skeletonPriceArea}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonPriceLabel}`}></div>
                    <div className={styles.skeletonRow}>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonBigPrice}`}></div>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonOldPrice}`}></div>
                    </div>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonNote}`}></div>
                  </div>
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
                <motion.div className={styles.discountBadge} whileHover={{ scale: 1.1, rotate: 2 }}>{game.discount}</motion.div>
              </div>

              <div className={styles.steamInfo}>
                <div className={styles.titleArea}>
                  <h3 className={styles.steamTitle}>{game.title}</h3>
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
                              <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: '#ccc' }}>
                                <ShoppingCart size={16} /> {isExpired ? 'EXPIRED' : 'SOLD OUT'}
                              </button>
                            </>
                          );
                        }

                        return (
                          <>
                            <div className={styles.hiddenKey}>••••••••••</div>
                            <button className={styles.btnUnlock} onClick={() => { setOfferPayLock('none'); setSelectedSteamGame(game); setModalState('idle'); }}>
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

      <Modal isOpen={modalState !== 'closed'} onClose={() => setModalState('closed')} maxWidth="500px">
        {modalState === 'idle' && selectedSteamGame ? (
          <div className={carouselStyles.checkoutModal} style={{ paddingTop: 0 }}>
            <div className={carouselStyles.modalHeader}>
              <img src={selectedSteamGame.image} className={carouselStyles.modalPreviewImg} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
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
                  <div onClick={() => setAcceptedTerms(!acceptedTerms)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)', textAlign: 'left' }}>
                    <div style={{ color: acceptedTerms ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {acceptedTerms ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>
                      I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link> for this purchase.
                    </span>
                  </div>
                  {acceptedTerms ? (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                        {/* Money Section */}
                        <div style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '1.25rem', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Pay with Money</h4>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* <PayPalCheckout
                              amount={selectedSteamGame.discountPrice}
                              game={selectedSteamGame.title}
                              offerId={selectedSteamGame.id}
                              onSuccess={async () => { setModalState('success'); }}
                            /> */}

                            {selectedSteamGame.lemonVariantId ? (
                              <LemonSqueezyOfferCheckout
                                offerId={selectedSteamGame.id}
                                disabled={offerPayLock === 'web3'}
                                onOpenStart={() => setOfferPayLock('lemon')}
                              />
                            ) : null}
                          </div>
                        </div>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: 0.3 }}>
                          <div style={{ flex: 1, height: '1px', background: 'var(--foreground)' }}></div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>OR</span>
                          <div style={{ flex: 1, height: '1px', background: 'var(--foreground)' }}></div>
                        </div>

                        {/* Crypto Section */}
                        <div style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          padding: '1.25rem', 
                          borderRadius: '12px', 
                          border: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <div style={{ width: '4px', height: '16px', background: '#f6851b', borderRadius: '2px' }}></div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Pay with Crypto</h4>
                          </div>

                          <Web3Checkout
                            amount={selectedSteamGame.discountPrice}
                            game={selectedSteamGame.title}
                            isOwned={false}
                            offerId={selectedSteamGame.id}
                            paymentLocked={offerPayLock === 'lemon'}
                            onPaymentActivityChange={(active) => {
                              setOfferPayLock((prev) => {
                                if (active) return 'web3';
                                if (prev === 'web3') return 'none';
                                return prev;
                              });
                            }}
                            onSuccess={async () => { setModalState('success'); }}
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
