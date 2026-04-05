'use client';
import { useState, useEffect } from 'react';
import styles from './GamesCarousel.module.css';
import { Play, ShoppingCart, User, CheckCircle2, Eye, EyeOff, Copy, Bug, Image as ImageIcon } from 'lucide-react';
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { login } from '@/app/page';
import Checkout from '@/lib/paypal';
import { motion, AnimatePresence } from 'framer-motion';
import { getOwnedGames } from '@/lib/paypal-server';
import Modal from './Modal';
import { useToast } from './Toast';


const GAMES = [
  {
    id: 1,
    title: 'Silent Murder',
    genre: 'Story & Survival Horror',
    description: 'A lonely road. A silent follower. Step into a dark story where an innocent girl becomes the target of a ruthless attacker.',
    image: 'silent-murder.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=X-IM7Q9jY4s',
    price: '$0.99',
    requirements: {
      min: 'Intel i5-4460 / 8GB RAM / GTX 750 Ti',
      max: 'Intel i7-8700K / 16GB RAM / RTX 2060'
    }
  },
  {
    id: 2,
    title: 'After Party',
    genre: 'Survival Horror',
    description: 'Lost in a strange and isolated place after chasing desire, you must collect money to survive.',
    image: 'after-party.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=X-IM7Q9jY4s',
    price: '$30.00',
    requirements: {
      min: 'Core i3 / 4GB RAM / GT 1030',
      max: 'Core i5 / 8GB RAM / GTX 1050 Ti'
    }
  },
  {
    id: 3,
    title: 'Revealed',
    genre: '2D & Multiplayer',
    description: 'A competitive multiplayer challenge where two players face off in intense levels inspired by Level Devil.',
    image: 'revealed.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=X-IM7Q9jY4s',
    price: '$5.00',
    requirements: {
      min: 'Dual Core CPU / 2GB RAM / Integrated Graphics',
      max: 'Quad Core CPU / 4GB RAM / Dedicated GPU'
    }
  },
  {
    id: 4,
    title: 'Survive',
    genre: 'Survival Horror',
    description: 'Ten minutes. One hunter. No escape. Stay alert and avoid being caught as a deadly creature chases you.',
    image: 'survive.png',
    video: 'https://www.youtube.com/embed/AiA6gZN_usg?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=X-IM7Q9jY4s',
    price: 'Free',
    requirements: {
      min: 'Core i5 / 8GB RAM / GTX 960',
      max: 'Core i7 / 16GB RAM / RTX 2070'
    }
  },
];


export default function GamesCarousel() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [purchasedTitles, setPurchasedTitles] = useState<string[]>([]);
  const [purchasedDetails, setPurchasedDetails] = useState<Record<string, any>>({});
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);
  const { showToast } = useToast();

  // New States
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isBugReportOpen, setIsBugReportOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');

  const fetchPurchases = async (uid: string) => {
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
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        fetchPurchases(u.uid);
      } else {
        setPurchasedTitles([]);
      }
    });
    return () => unsub();
  }, []);

  const [activeIndex, setActiveIndex] = useState(0);
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'loading' | 'success' | 'details'>('closed');
  const [selectedGame, setSelectedGame] = useState<typeof GAMES[0] | null>(null);
  const [isLocked, setIsLocked] = useState(false); // New lock timing state

  // Coupon States
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput) return;
    setIsValidating(true);
    setCouponError("");
    try {
      const { validateCoupon } = await import('@/lib/paypal-server');
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

  // Auto advance logic
  useEffect(() => {
    const timer = setInterval(() => {
      if (modalState !== 'closed' || isBugReportOpen || isLocked) return;
      setActiveIndex((current) => (current + 1) % GAMES.length);
    }, 20000);

    return () => clearInterval(timer);
  }, [modalState, isBugReportOpen, isLocked]);

  const handleThumbClick = (index: number) => {
    setActiveIndex(index);
  };

  const handleBuyClick = (game: typeof GAMES[0]) => {
    if (purchasedTitles.includes(game.title)) return;
    setSelectedGame(game);
    setModalState('idle');
  };

  useEffect(() => {
    if (modalState !== 'closed') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setCouponInput("");
      setAppliedCoupon(null);
      setCouponError("");
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalState]);

  const activeGame = GAMES[activeIndex];

  return (
    <div className={`${styles.carouselContainer} ${modalState !== 'closed' ? styles.modalOpenContext : ''}`} id="project">
      <div className={styles.headerRow}>
        <span className="sectionLabel">Our Creations</span>
        <h2 className={styles.mainTitle}>Featured Game Studio Works</h2>
      </div>

      {/* Epic Games-like Carousel Wrapper */}
      <div className={styles.carouselInner}>

        {/* Main large display */}
        <div className={styles.activeDisplay}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
            >
              <iframe
                src={activeGame.video}
                className={styles.activeIframe}
                title={activeGame.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </motion.div>
          </AnimatePresence>

          <div className={styles.overlay}>
            <div className={styles.textContent}>
              <span className={styles.statusBadge}>Available Now</span>
              <h2 className={styles.title}>{activeGame.title}</h2>
              <p className={styles.description}>{activeGame.description}</p>

              <div className={styles.actions}>
                <button
                  className="btnSolid"
                  disabled={activeGame.price !== 'Free' && !purchasedTitles.includes(activeGame.title)}
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
                    onClick={() => handleBuyClick(activeGame)}
                    disabled={isCheckingPurchases}
                  >
                    <ShoppingCart size={16} /> Buy Now - {activeGame.price}
                  </button>
                )}

                <button
                  className="btnOutline"
                  style={{ padding: '0.4rem 1rem' }}
                  onClick={() => setIsLocked(!isLocked)}
                  title={isLocked ? "Unlock Auto-Play" : "Lock Auto-Play"}
                >
                  {isLocked ? <Play size={16} /> : <span style={{ fontSize: '14px', fontWeight: 'bold' }}>||</span>}
                </button>
                <button
                  className="btnOutline"
                  style={{ padding: '0.4rem 1rem' }}
                  onClick={() => { setSelectedGame(activeGame); setIsBugReportOpen(true); }}
                  title="Report Bug"
                >
                  <Bug size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Thumbnails Navigation list (Right Side) */}
        <div className={styles.thumbnailList}>
          {GAMES.map((game, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={game.id}
                className={`${styles.thumbnailBtn} ${isActive ? styles.activeThumb : ''}`}
                onClick={() => handleThumbClick(idx)}
              >
                <div className={styles.thumbImageWrapper}>
                  <img src={game.image} alt={game.title} className={styles.thumbImg} />
                  {purchasedTitles.includes(game.title) && (
                    <div className={styles.ownedOverlay}>
                      <CheckCircle2 size={12} color="var(--primary)" />
                    </div>
                  )}
                </div>
                <div className={styles.thumbInfo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '0.5rem' }}>
                    <span className={styles.thumbTitle}>{game.title}</span>
                    <span className={styles.thumbTag}>
                      {purchasedTitles.includes(game.title) ? 'Purchased' : game.price === 'Free' ? 'Free' : game.price}
                    </span>
                  </div>
                  <span className={styles.thumbDesc}>{game.description}</span>
                </div>
                {isActive && <div className={styles.progressBar}></div>}
              </button>
            );
          })}
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
                          const discRaw = appliedCoupon.discount;
                          const discStr = String(discRaw).trim();
                          let finalAmt = base;

                          if (discStr.includes('%')) {
                            const percent = parseFloat(discStr) || 0;
                            finalAmt = base - (base * percent / 100);
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
              <input
                type="text"
                placeholder="COUPON CODE"
                className={styles.couponInput}
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={!!appliedCoupon}
              />
              <button
                className={styles.applyBtn}
                onClick={handleApplyCoupon}
                disabled={isValidating || !couponInput || !!appliedCoupon}
                style={{
                  background: appliedCoupon ? 'transparent' : '#feb60c',
                  cursor: appliedCoupon ? 'default' : 'pointer',
                  border: appliedCoupon ? 'none' : 'initial'
                }}
              >
                {isValidating ? "..." : appliedCoupon ? "Applied" : "Apply"}
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ fontSize: '0.75rem', color: '#ccc', marginTop: '-5px', marginBottom: '10px', display: 'flex',flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                Discount: {appliedCoupon.discount} off

                <span>{appliedCoupon.name}</span>
                <span>Expires: {appliedCoupon.expire}</span>
                <span>{appliedCoupon.quantity} left</span>

                <button
                  onClick={() => { setAppliedCoupon(null); setCouponInput(""); }}
                  style={{background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Remove
                </button>

              </div>
            )}

            <div className={styles.modalFooter}>
              {user ? (
                <Checkout
                  amount={selectedGame.price}
                  game={selectedGame.title}
                  isOwned={purchasedTitles.includes(selectedGame.title)}
                  onSuccess={() => fetchPurchases(user.uid)}
                  appliedCoupon={appliedCoupon}
                />
              ) : (
                <button className="btnSolid" onClick={login} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', width: "100%" }}>
                  <User size={14} /> <span className={styles.connectText}>Connect Google</span>
                </button>
              )}
              <button className={styles.laterBtn} onClick={() => setModalState('closed')}>Select Later</button>
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

            <div className={styles.detailsSection} style={{ background: 'var(--outline-color)', padding: '1.25rem', borderRadius: '8px' }}>
              <span style={{ display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>Activation Key</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, padding: '0.8rem', background: 'var(--background)', fontFamily: 'monospace', fontSize: '1rem', color: 'var(--primary)', letterSpacing: '2px', borderRadius: '4px', overflow: 'hidden' }}>
                  {isKeyVisible ? purchasedDetails[selectedGame.title]?.activationKey : '••••••••••••••••••••'}
                </div>
                <button className="btnOutline" style={{ padding: '0.8rem' }} onClick={() => setIsKeyVisible(!isKeyVisible)}>
                  {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button className="btnSolid" style={{ padding: '0.8rem' }} onClick={() => {
                  navigator.clipboard.writeText(purchasedDetails[selectedGame.title]?.activationKey);
                  showToast("Activation key copied to clipboard!", "success");
                }}>
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className="btnSolid" style={{ width: '100%' }} onClick={() => setModalState('closed')}>Back to Hub</button>
            </div>
          </div>
        ) : modalState === 'loading' ? (
          <div style={{ textAlign: 'center' }}>
            <div className={styles.modalLoader}></div>
            <h2 className={styles.modalTitle}>Verifying...</h2>
            <p className={styles.modalText}>Your payment is being processed through our secure servers.</p>
          </div>
        ) : (
          <div className={styles.successState}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={32} />
            </div>
            <h2 className={styles.modalTitle}>Purchase Confirmed</h2>
            <p className={styles.modalText}>{selectedGame?.title} has been added to your library. Check your email for the key.</p>
            <button className="btnSolid" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setModalState('closed')}>
              Back to Hub
            </button>
          </div>
        )}
      </Modal>

      {/* Bug Report Modal */}
      <Modal isOpen={isBugReportOpen && !!selectedGame} onClose={() => setIsBugReportOpen(false)} title="Report an Issue">
        {selectedGame && (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <p className={styles.modalText} style={{ marginTop: '-1rem' }}>Send a bug report directly to the development team for <strong>{selectedGame.title}</strong>.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                placeholder="Your attached email"
                style={{ width: '100%', padding: '0.8rem', background: 'var(--outline-color)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px' }}
              />

              <input
                type="text"
                placeholder="Issue Title (e.g. Game crashes on start)"
                value={bugTitle}
                onChange={e => setBugTitle(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', color: 'var(--foreground)', borderRadius: '8px', outline: 'none' }}
              />

              <textarea
                placeholder="Steps to reproduce or describe the bug..."
                value={bugDesc}
                onChange={e => setBugDesc(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical', borderRadius: '8px', outline: 'none' }}
              ></textarea>

              <div style={{ padding: '1rem', border: '1px dashed var(--outline-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '8px', transition: 'background 0.3s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--outline-color)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <ImageIcon size={16} /> Attach Screenshot
              </div>
            </div>

            <div className={styles.modalFooter} style={{ marginTop: '1rem' }}>
              <button
                className="btnSolid"
                style={{ width: '100%' }}
                onClick={() => {
                  showToast("Bug report sent. Thank you for your feedback!", "success");
                  setIsBugReportOpen(false);
                }}
              >
                Submit Report
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
