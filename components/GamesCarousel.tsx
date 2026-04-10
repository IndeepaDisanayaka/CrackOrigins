'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './GamesCarousel.module.css';
import { Play, ShoppingCart, User, CheckCircle2, Eye, EyeOff, Copy, Bug, Image as ImageIcon, Monitor } from 'lucide-react';
import { useAuth } from '../lib/contexts/AuthContext';
import { useModals } from '../lib/contexts/ModalContext';
import Web3Checkout from './Web3Checkout';
import { motion, AnimatePresence } from 'framer-motion';
import { getOwnedGames, validateCoupon } from '@/lib/admin-actions';
import Modal from './Modal';
import { useToast } from './Toast';
import { CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';

const GAMES = [
  {
    id: 1,
    title: 'Silent Murder',
    genre: 'Story & Survival Horror',
    description: 'A lonely road. A silent follower. Step into a dark story where an innocent girl becomes the target of a ruthless attacker.',
    image: 'silent-murder.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg',
    price: '$0.99',
    requirements: {
      min: 'Intel i5-4460 / 8GB RAM / GTX 750 Ti',
      max: 'Intel i7-8700K / 16GB RAM / RTX 2060'
    },
    os: 'Windows'
  },
  {
    id: 2,
    title: 'After Party',
    genre: 'Survival Horror',
    description: 'Lost in a strange and isolated place after chasing desire, you must collect money to survive.',
    image: 'after-party.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg',
    price: '$30.00',
    requirements: {
      min: 'Core i3 / 4GB RAM / GT 1030',
      max: 'Core i5 / 8GB RAM / GTX 1050 Ti'
    },
    os: 'Windows'
  },
  {
    id: 3,
    title: 'Revealed',
    genre: '2D & Multiplayer',
    description: 'A competitive multiplayer challenge where two players face off in intense levels inspired by Level Devil.',
    image: 'revealed.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg',
    price: '$5.00',
    requirements: {
      min: 'Dual Core CPU / 2GB RAM / Integrated Graphics',
      max: 'Quad Core CPU / 4GB RAM / Dedicated GPU'
    },
    os: 'Windows'
  },
  {
    id: 4,
    title: 'Survive',
    genre: 'Survival Horror',
    description: 'Ten minutes. One hunter. No escape. Stay alert and avoid being caught as a deadly creature chases you.',
    image: 'survive.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg',
    price: 'Free',
    requirements: {
      min: 'Core i5 / 8GB RAM / GTX 960',
      max: 'Core i7 / 16GB RAM / RTX 2070'
    },
    os: 'Windows'
  },
];

export default function GamesCarousel() {
  const { user } = useAuth();
  const { isAuthModalOpen, setIsAuthModalOpen, isBugReportOpen, setIsBugReportOpen } = useModals();
  const { showToast } = useToast();

  const [purchasedTitles, setPurchasedTitles] = useState<string[]>([]);
  const [purchasedDetails, setPurchasedDetails] = useState<Record<string, any>>({});
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState(0);

  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'loading' | 'success' | 'details'>('closed');
  const [selectedGame, setSelectedGame] = useState<typeof GAMES[0] | null>(null);
  const [isLocked, setIsLocked] = useState(false); 

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (constraintsRef.current) {
      setDragWidth(constraintsRef.current.scrollWidth - constraintsRef.current.offsetWidth);
    }
  }, []);

  const fetchPurchases = async (uid: string) => {
    if (!uid) return;
    setIsCheckingPurchases(true);
    try {
      const res = await getOwnedGames(uid);
      if (res.success && res.games) {
        setPurchasedTitles(res.games);
        setPurchasedDetails(res.details || {});
      }
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setIsCheckingPurchases(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPurchases(user.uid);
    } else {
      setPurchasedTitles([]);
      setPurchasedDetails({});
    }
  }, [user]);

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setIsValidating(true);
    try {
      const result = await validateCoupon(couponInput);
      if (result.success && result.coupon) {
        setAppliedCoupon(result.coupon);
        showToast(`Coupon applied! ${result.coupon.name} discount activated.`, "success");
      } else {
        setAppliedCoupon(null);
        showToast(result.error || "Invalid coupon.", "error");
      }
    } catch (err) {
      showToast("Error validating coupon.", "error");
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (modalState !== 'closed' || isBugReportOpen || isLocked) return;
      setActiveIndex((current) => (current + 1) % GAMES.length);
    }, 20000);
    return () => clearInterval(timer);
  }, [modalState, isBugReportOpen, isLocked]);

  useEffect(() => {
    if (modalState !== 'closed') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setCouponInput("");
      setAppliedCoupon(null);
      setAcceptedTerms(false);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [modalState]);

  const activeGame = GAMES[activeIndex];

  return (
    <div className={`${styles.carouselContainer} ${modalState !== 'closed' ? styles.modalOpenContext : ''}`} id="project">
      <div className={styles.headerRow}>
        <span className="sectionLabel">Our Creations</span>
        <h2 className={styles.mainTitle}>Featured Game Studio Works</h2>
      </div>

      <div className={styles.carouselWrapper}>
        <div className={styles.mainStage}>
          <div className={styles.stageBackground}>
            <AnimatePresence mode="wait">
              <motion.img
                key={`bg-${activeIndex}`}
                src={activeGame.image}
                className={styles.bgImage}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            </AnimatePresence>
          </div>

          <div className={styles.activeMedia}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', height: '100%' }}
              >
                <iframe
                  src={`${activeGame.video}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&disablekb=1&playlist=${activeGame.video.split('/').pop()}&loop=1`}
                  className={styles.activeIframe}
                  title={activeGame.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </motion.div>
            </AnimatePresence>

            <div className={styles.navRibbonContainer} ref={constraintsRef}>
              <motion.div 
                className={styles.navRibbon}
                drag="x"
                dragConstraints={{ right: 0, left: -dragWidth }}
                dragElastic={0.4}
                whileTap={{ cursor: "grabbing" }}
              >
                {GAMES.map((game, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={game.id}
                      className={`${styles.navItem} ${isActive ? styles.activeNavItem : ''}`}
                      onClick={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <img src={game.image} alt={game.title} className={styles.navThumb} />
                      <div className={styles.navInfo}>
                        <div className={styles.navTitleRow}>
                          <span className={styles.navTitle}>{game.title}</span>
                          <Monitor size={10} className={styles.osIcon} />
                        </div>
                        <div className={styles.navLabels}>
                          <span className={isActive ? styles.activeLabel : ''}>
                            {purchasedTitles.includes(game.title) ? 'Owned' : game.price}
                          </span>
                          <span>•</span>
                          <span>{game.genre.split('&')[0]}</span>
                        </div>
                      </div>
                      {isActive && !isLocked && (
                        <motion.div 
                          className={styles.navProgressBar}
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 20, ease: "linear" }}
                        />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </div>
          </div>

          <div className={styles.contentOverlay}>
            <motion.div
              key={`content-${activeIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className={styles.statusBadge}>Featured Release</span>
              <h3 className={styles.genre}>{activeGame.genre}</h3>
              <h2 className={styles.title}>{activeGame.title}</h2>
              <p className={styles.description}>{activeGame.description}</p>

              <div className={styles.actions}>
                <button
                  className="btnSolid"
                  disabled={activeGame.price !== 'Free' && !purchasedTitles.includes(activeGame.title)}
                  style={{ minWidth: '160px' }}
                >
                  <Play size={14} fill="currentColor" />
                  {activeGame.price === 'Free' || purchasedTitles.includes(activeGame.title) ? 'Play Now' : 'Unlock to Play'}
                </button>

                {purchasedTitles.includes(activeGame.title) ? (
                  <button
                    className="btnBuyNow"
                    onClick={() => { setSelectedGame(activeGame); setModalState('details'); setIsKeyVisible(false); }}
                  >
                    <Eye size={16} /> View Details
                  </button>
                ) : activeGame.price !== 'Free' && (
                  <button
                    className="btnBuyNow"
                    onClick={() => { setSelectedGame(activeGame); setModalState('idle'); }}
                    disabled={isCheckingPurchases}
                  >
                    <ShoppingCart size={16} /> Buy Now - {activeGame.price}
                  </button>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btnOutline" style={{ padding: '0.7rem' }} onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Unlock Auto-Play" : "Lock Auto-Play"}>
                    {isLocked ? <Play size={16} /> : <span style={{ fontSize: '14px', fontWeight: 'bold' }}>||</span>}
                  </button>
                  <button className="btnOutline" style={{ padding: '0.7rem' }} onClick={() => { setSelectedGame(activeGame); setIsBugReportOpen(true); }} title="Report Bug">
                    <Bug size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <Modal isOpen={modalState !== 'closed'} onClose={() => setModalState('closed')} maxWidth="500px">
        {modalState === 'idle' && selectedGame ? (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <div className={styles.modalHeader}>
              <img src={selectedGame.image} className={styles.modalPreviewImg} alt="preview" />
              <div className={styles.modalHeaderInfo}>
                <span className={styles.gameTitle}>{selectedGame.title}</span>
                <span className={styles.gamePrice}>
                  {appliedCoupon ? (
                    <>
                      <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.8rem', marginRight: '5px' }}>{selectedGame.price}</span>
                      <span>
                        ${(() => {
                          const base = parseFloat(selectedGame.price.replace(/[^0-9.]/g, '')) || 0;
                          const discStr = String(appliedCoupon.discount).trim();
                          let finalAmt = base;
                          if (discStr.includes('%')) {
                            finalAmt = base - (base * parseFloat(discStr) / 100);
                          } else {
                            finalAmt = base - (parseFloat(discStr) || 0);
                          }
                          return Math.max(0, finalAmt).toFixed(2);
                        })()}
                      </span>
                    </>
                  ) : selectedGame.price}
                </span>
              </div>
            </div>

            <div className={styles.requirementsSection}>
              <div className={styles.reqBlock}>
                <span className={styles.reqLabel}>Minimum Requirements</span>
                <p className={styles.reqText}>{selectedGame.requirements.min}</p>
              </div>
              <div className={styles.reqBlock}>
                <span className={styles.reqLabel}>Recommended</span>
                <p className={styles.reqText}>{selectedGame.requirements.max}</p>
              </div>
            </div>

            <div className={styles.couponSection}>
              <input type="text" placeholder="COUPON CODE" className={styles.couponInput} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} disabled={!!appliedCoupon} />
              <button className={styles.applyBtn} onClick={handleApplyCoupon} disabled={isValidating || !couponInput || !!appliedCoupon} style={{ background: appliedCoupon ? 'transparent' : '#feb60c', cursor: appliedCoupon ? 'default' : 'pointer', border: appliedCoupon ? 'none' : 'initial' }}>
                {isValidating ? "..." : appliedCoupon ? "Applied" : "Apply"}
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ fontSize: '0.75rem', color: '#ccc', marginTop: '-5px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                Discount: {appliedCoupon.discount} off <span>{appliedCoupon.name}</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} style={{ background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Remove</button>
              </div>
            )}

            <div className={styles.modalFooter}>
              {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                   <div onClick={() => setAcceptedTerms(!acceptedTerms)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', width: '100%', padding: '0.75rem', border: '1px solid var(--outline-color)', textAlign: 'left' }}>
                    <div style={{ color: acceptedTerms ? 'var(--primary)' : 'var(--text-muted)' }}>{acceptedTerms ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--foreground)' }}>I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--primary)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link> for this purchase.</span>
                  </div>
                  {acceptedTerms ? (
                    <Web3Checkout amount={selectedGame.price} game={selectedGame.title} isOwned={purchasedTitles.includes(selectedGame.title)} onSuccess={() => fetchPurchases(user.uid)} appliedCoupon={appliedCoupon} />
                  ) : (
                    <button className="btnSolid" disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>Accept Terms to Buy</button>
                  )}
                </div>
              ) : (
                <button className="btnSolid" onClick={() => setIsAuthModalOpen(true)} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', width: "100%", justifyContent: 'center' }}>
                  <User size={14} /> <span className={styles.connectText}>Connect Google</span>
                </button>
              )}
            </div>
          </div>
        ) : modalState === 'details' && selectedGame ? (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <h2 className={styles.modalTitle} style={{ marginTop: '1rem' }}>Game Details</h2>
            <div className={styles.modalHeader}>
              <img src={selectedGame.image} className={styles.modalPreviewImg} alt="preview" style={{ width: '80px', height: '80px', borderRadius: '8px' }} />
              <div className={styles.modalHeaderInfo}>
                <span className={styles.gameTitle}>{selectedGame.title}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Purchased on: {new Date(purchasedDetails[selectedGame.title]?.purchaseDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className={styles.detailsSection}>
              <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>Activation Key</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, padding: '0.8rem', background: 'var(--background)', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary)', letterSpacing: '2px', borderRadius: '4px', overflow: 'hidden' }}>
                  {isKeyVisible ? purchasedDetails[selectedGame.title]?.activationKey : '••••••••••••••••••••'}
                </div>
                <button className="btnOutline" style={{ padding: '0.8rem' }} onClick={() => setIsKeyVisible(!isKeyVisible)}>{isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button className="btnSolid" style={{ padding: '0.8rem' }} onClick={() => { navigator.clipboard.writeText(purchasedDetails[selectedGame.title]?.activationKey); showToast("Activation key copied to clipboard!", "success"); }}><Copy size={16} /></button>
              </div>
            </div>
            <div className={styles.modalFooter}><button className="btnSolid" style={{ width: '100%' }} onClick={() => setModalState('closed')}>Back to Hub</button></div>
          </div>
        ) : modalState === 'loading' ? (
          <div style={{ textAlign: 'center' }}>
            <div className="premiumLoader"><div className="glitchLoader" style={{ fontSize: '1.5rem' }}>VERIFYING...</div></div>
            <p className={styles.modalText} style={{ marginTop: '1rem' }}>Your payment is being processed through our secure servers.</p>
          </div>
        ) : (
          <div className={styles.successState}>
            <div className={styles.successIcon}><CheckCircle2 size={32} /></div>
            <h2 className={styles.modalTitle}>Purchase Confirmed</h2>
            <p className={styles.modalText}>{selectedGame?.title} has been added to your library. Check your email for the key.</p>
            <button className="btnSolid" style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }} onClick={() => setModalState('closed')}>Back to Hub</button>
          </div>
        )}
      </Modal>

      <Modal isOpen={isBugReportOpen && !!selectedGame} onClose={() => setIsBugReportOpen(false)} title="Report an Issue">
        {selectedGame && (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <p className={styles.modalText} style={{ marginTop: '-1rem' }}>Send a bug report directly to the development team for <strong>{selectedGame.title}</strong>.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" value={user?.email || ''} disabled placeholder="Your attached email" style={{ width: '100%', padding: '0.8rem', background: 'var(--outline-color)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px' }} />
              <input type="text" placeholder="Issue Title" value={bugTitle} onChange={e => setBugTitle(e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', borderRadius: '8px' }} />
              <textarea placeholder="Steps to reproduce..." value={bugDesc} onChange={e => setBugDesc(e.target.value)} rows={4} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', borderRadius: '8px' }}></textarea>
              <div style={{ padding: '1rem', border: '1px dashed var(--outline-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '8px' }}><ImageIcon size={16} /> Attach Screenshot</div>
            </div>
            <div className={styles.modalFooter} style={{ marginTop: '1rem' }}>
              <button className="btnSolid" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { showToast("Bug report sent. Thank you for your feedback!", "success"); setIsBugReportOpen(false); }}>Submit Report</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
