'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './GamesCarousel.module.css';
import { Play, ShoppingCart, User, CheckCircle2, Eye, EyeOff, Copy, Bug, Image as ImageIcon, Monitor, Smartphone, Laptop, Download, Shield, Share2 } from 'lucide-react';
import { useAuth } from '../lib/contexts/AuthContext';
import { useModals } from '../lib/contexts/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getOwnedGames, validateCoupon, getGames, incrementDownloadCount } from '@/lib/admin-actions';
import Modal from './Modal';
import { useToast } from './Toast';
import PayPalCheckout from '@/lib/paypal';
import CheckCircle from './CheckCircle';
import Link from 'next/link';
import Image from 'next/image';

// GAMES constant removed, now using state

export default function GamesCarousel() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAuthModalOpen, setIsAuthModalOpen, isBugReportOpen, setIsBugReportOpen } = useModals();
  const { showToast } = useToast();

  const [purchasedTitles, setPurchasedTitles] = useState<string[]>([]);
  const [purchasedDetails, setPurchasedDetails] = useState<Record<string, any>>({});
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [games, setGames] = useState<any[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'loading' | 'success' | 'details'>('closed');
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [isSendingBug, setIsSendingBug] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const WindowsIcon = ({ size = 14, className }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M0 3.449L9.75 2.1V11.59H0V3.449zm0 8.86h9.75v9.45L0 20.39V12.309zM10.71 1.95L24 0v11.59h-13.29V1.95zm0 10.359H24V24l-13.29-1.91v-9.78z" />
    </svg>
  );



  useEffect(() => {
    const loadGames = async () => {
      setIsLoadingGames(true);
      try {
        const res = await getGames();
        if (res.success && res.games) {
          setGames(res.games);
        }
      } catch (err) {
        console.error("Failed to load games:", err);
      } finally {
        setIsLoadingGames(false);
      }
    };
    loadGames();
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



  const triggerDirectDownload = (game: any) => {
    if (!game.itchUploadId && !game.downloadUrl) {
      showToast("Download link not available for this title.", "error");
      return;
    }

    // Increment count with uniqueness filter
    incrementDownloadCount(game.id, user?.uid);

    if (game.itchUploadId) {
      // Use secure proxy
      window.location.href = `/api/download?uploadId=${game.itchUploadId}`;
    } else {
      // Fallback
      window.open(game.downloadUrl, '_blank');
    }

    showToast(`Initializing secure download for ${game.title}...`, "success");
  };

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

  const renderOSIcons = (osStr: string) => {
    const os = osStr.toLowerCase();
    const icons = [];
    if (os.includes('windows')) icons.push(<WindowsIcon key="win" />);
    if (os.includes('mac') || os.includes('apple') || os.includes('ios')) icons.push(<Laptop size={14} key="mac" />);
    if (os.includes('android')) icons.push(<Smartphone size={14} key="android" />);
    return <div style={{ display: 'flex', gap: '8px', color: 'var(--primary)', marginTop: '4px' }}>{icons}</div>;
  };



  if (isLoadingGames) {
    return (
      <div className={styles.carouselContainer} style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="premiumLoader"><div className="glitchLoader">LOADING CREATIONS...</div></div>
      </div>
    );
  }

  if (games.length === 0) return null;

  const scrollLeft = () => {
    if (scrollRef.current) {
      const cardWidth = window.innerWidth <= 768 ? window.innerWidth : 320;
      scrollRef.current.scrollBy({ left: -cardWidth, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      const cardWidth = window.innerWidth <= 768 ? window.innerWidth : 320;
      scrollRef.current.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  };

  return (
    <div className={`${styles.carouselContainer} ${modalState !== 'closed' ? styles.modalOpenContext : ''}`} id="games">
      <div className={styles.headerContainer}>
        <div className={styles.headerLeft}>
          <span className="sectionLabel">Our Creations</span>
          <h2 className={styles.mainTitle}>Featured Game Studio Works</h2>
        </div>
        <div className={styles.navButtons}>
          <button className={styles.navBtn} onClick={scrollLeft}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button className={styles.navBtn} onClick={scrollRight}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className={styles.cardsWrapper} ref={scrollRef}>
        {games.map((game, idx) => {
          const isOwned = purchasedTitles.includes(game.title);
          const isFree = game.price === 'Free';
          
          return (
            <div key={game.id || idx} className={styles.card} onClick={() => {
              router.push(`/games/${game.slug}`);
            }}>
              <Image
                src={(game.images && game.images.length > 0) ? game.images[0] : (game.image || '/placeholder-game.png')}
                alt={game.title}
                fill
                className={styles.cardImage}
              />
              <div className={styles.cardOverlay}></div>
              
              <div className={styles.topRightIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
              </div>
              
              <div className={styles.cardContent}>
                <div className={styles.stars}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <h3 className={styles.cardTitle}>{game.title}</h3>
                <p className={styles.cardSubtitle}>{game.genre.split(',')[0]} • {game.price}</p>
                
                <div className={styles.cardActions}>
                  {game.platform === 'playstore' ? (
                    <button 
                      className={`${styles.actionBtn} ${styles.primary}`} 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (game.redirectUrl) window.open(game.redirectUrl, '_blank'); 
                        else showToast("Redirecting...", "success");
                      }}
                    >
                      <Play size={14} /> Get on Play Store
                    </button>
                  ) : (isOwned || isFree) ? (
                    <>
                      <button className={`${styles.actionBtn} ${styles.primary}`} onClick={(e) => { e.stopPropagation(); triggerDirectDownload(game); }}>
                        <Download size={14} /> Download
                      </button>
                      {isOwned && (
                        <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setSelectedGame(game); setModalState('details'); }}>
                          <Shield size={14} /> Key
                        </button>
                      )}
                    </>
                  ) : (
                    <button className={`${styles.actionBtn} ${styles.primary}`} onClick={(e) => { e.stopPropagation(); setSelectedGame(game); setModalState('idle'); }}>
                      <ShoppingCart size={14} /> Buy Now
                    </button>
                  )}
                  <button className={styles.actionBtn} onClick={(e) => { e.stopPropagation(); setSelectedGame(game); setIsBugReportOpen(true); }}>
                    <Bug size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={modalState !== 'closed'} onClose={() => setModalState('closed')} maxWidth="500px">
        {modalState === 'idle' && selectedGame ? (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <div className={styles.modalHeader}>
              <Image width={400} height={200} quality={75} src={selectedGame.image} className={styles.modalPreviewImg} alt="preview" />
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
                <p className={styles.reqText} style={{ fontSize: '0.65rem', lineHeight: 1.4 }}>
                  {typeof selectedGame.requirements?.min === 'object' ? (
                    `${selectedGame.requirements.min.processor || ''} • ${selectedGame.requirements.min.memory || ''} • ${selectedGame.requirements.min.graphics || ''} • ${selectedGame.requirements.min.storage || ''}`
                  ) : (
                    selectedGame.requirements?.min || 'N/A'
                  )}
                </p>
              </div>
              <div className={styles.reqBlock}>
                <span className={styles.reqLabel}>Recommended Specs</span>
                <p className={styles.reqText} style={{ fontSize: '0.65rem', lineHeight: 1.4 }}>
                  {typeof selectedGame.requirements?.max === 'object' ? (
                    `${selectedGame.requirements.max.processor || ''} • ${selectedGame.requirements.max.memory || ''} • ${selectedGame.requirements.max.graphics || ''} • ${selectedGame.requirements.max.storage || ''}`
                  ) : (
                    selectedGame.requirements?.max || 'N/A'
                  )}
                </p>
              </div>
            </div>

            <div className={styles.couponSection}>
              <input type="text" placeholder="COUPON CODE" className={styles.couponInput} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} disabled={!!appliedCoupon} />
              <button className={styles.applyBtn} onClick={handleApplyCoupon} disabled={isValidating || !couponInput || !!appliedCoupon} style={{ background: appliedCoupon ? 'transparent' : 'var(--primary)', cursor: appliedCoupon ? 'default' : 'pointer', border: appliedCoupon ? 'none' : 'initial' }}>
                {isValidating ? "..." : appliedCoupon ? "Applied" : "Apply"}
              </button>
            </div>
            {appliedCoupon && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-5px', marginBottom: '10px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                Discount: {appliedCoupon.discount} off <span>{appliedCoupon.name}</span>
                <button onClick={() => { setAppliedCoupon(null); setCouponInput(""); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>Remove</button>
              </div>
            )}

            <div className={styles.modalFooter}>
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
                      <div style={{
                        background: 'rgba(var(--foreground-rgb), 0.03)',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(var(--foreground-rgb), 0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <div style={{ width: '4px', height: '16px', background: 'var(--primary)', borderRadius: '2px' }}></div>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--foreground)' }}>Secure Checkout (PayPal)</h4>
                        </div>

                        <PayPalCheckout
                          amount={(() => {
                            const base = parseFloat(selectedGame.price.replace(/[^0-9.]/g, '')) || 0;
                            if (!appliedCoupon) return base.toFixed(2);
                            const discStr = String(appliedCoupon.discount).trim();
                            let finalAmt = base;
                            if (discStr.includes('%')) {
                              finalAmt = base - (base * parseFloat(discStr) / 100);
                            } else {
                              finalAmt = base - (parseFloat(discStr) || 0);
                            }
                            return Math.max(0, finalAmt).toFixed(2);
                          })()}
                          game={selectedGame.title}
                          gameId={selectedGame.id}
                          isOwned={purchasedTitles.includes(selectedGame.title)}
                          onSuccess={() => fetchPurchases(user.uid)}
                          appliedCoupon={appliedCoupon}
                        />
                      </div>
                    </div>
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
          <div className={styles.checkoutModal} style={{ paddingTop: 0, padding: '2rem' }}>
            <h2 className={styles.screenshotModalTitle}>GAME DETAILS</h2>
            <div className={styles.screenshotModalHeader}>
              <div style={{ width: '80px', height: '110px', position: 'relative', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <Image width={80} height={110} quality={75} src={selectedGame.image} className={styles.modalPreviewImg} alt="preview" style={{ objectFit: 'cover', border: 'none' }} />
              </div>
              <div className={styles.screenshotModalHeaderInfo}>
                <span className={styles.screenshotGameTitle}>{selectedGame.title}</span>
                {purchasedDetails[selectedGame.title]?.purchaseDate && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Purchased on: {new Date(purchasedDetails[selectedGame.title].purchaseDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className={styles.screenshotKeyContainer}>
              <span className={styles.screenshotKeyLabel}>ACTIVATION KEY</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className={styles.screenshotKeyBox}>
                  {isKeyVisible ? (purchasedDetails[selectedGame.title]?.activationKey || 'NO-KEY-FOUND') : '••••••••••••••••••••••••'}
                </div>
                <button className={styles.screenshotVisibilityBtn} onClick={() => setIsKeyVisible(!isKeyVisible)}>
                  {isKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button className={styles.screenshotCopyBtn} onClick={() => {
                  if (purchasedDetails[selectedGame.title]?.activationKey) {
                    navigator.clipboard.writeText(purchasedDetails[selectedGame.title].activationKey);
                    showToast("Activation key copied to clipboard!", "success");
                  }
                }}>
                  <Copy size={18} />
                </button>
              </div>
            </div>
            <div style={{ marginTop: '2.5rem' }}>
              <button className={styles.screenshotFooterBtn} onClick={() => setModalState('closed')}>BACK TO HUB</button>
            </div>
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

      <Modal isOpen={isBugReportOpen && !!selectedGame} onClose={() => { setIsBugReportOpen(false); setBugTitle(''); setBugDesc(''); setAttachment(null); }} title="Report an Issue">
        {selectedGame && (
          <div className={styles.checkoutModal} style={{ paddingTop: 0 }}>
            <p className={styles.modalText} style={{ marginTop: '-1rem' }}>Send a bug report directly to the development team for <strong>{selectedGame.title}</strong>.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="email" value={user?.email || ''} disabled placeholder="Your attached email" style={{ width: '100%', padding: '0.8rem', background: 'var(--outline-color)', border: 'none', color: 'var(--text-muted)', borderRadius: '8px' }} />
              <input type="text" placeholder="Issue Title" value={bugTitle} onChange={e => setBugTitle(e.target.value)} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', borderRadius: '8px', color: 'var(--foreground)' }} disabled={isSendingBug} />
              <textarea placeholder="Steps to reproduce..." value={bugDesc} onChange={e => setBugDesc(e.target.value)} rows={4} style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--outline-color)', background: 'var(--background)', borderRadius: '8px', color: 'var(--foreground)', resize: 'vertical' }} disabled={isSendingBug}></textarea>

              <label style={{ padding: '1rem', border: '1px dashed var(--outline-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: isSendingBug ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', borderRadius: '8px', opacity: isSendingBug ? 0.5 : 1 }}>
                <ImageIcon size={16} /> {attachment ? attachment.name : 'Attach Screenshot (Max 10MB)'}
                <input
                  type="file"
                  accept="image/*,.pdf,.txt"
                  style={{ display: 'none' }}
                  disabled={isSendingBug}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) {
                        showToast("File size exceeds 10MB limit.", "error");
                        e.target.value = '';
                      } else {
                        setAttachment(file);
                      }
                    }
                  }}
                />
              </label>
              {attachment && (
                <button
                  onClick={() => setAttachment(null)}
                  disabled={isSendingBug}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textAlign: 'right', fontSize: '0.8rem', marginTop: '-0.5rem' }}
                >
                  Remove Attachment
                </button>
              )}
            </div>
            <div className={styles.modalFooter} style={{ marginTop: '1rem' }}>
              <button
                className="btnSolid"
                style={{ width: '100%', justifyContent: 'center', opacity: (isSendingBug || !bugTitle || !bugDesc) ? 0.5 : 1 }}
                disabled={isSendingBug || !bugTitle || !bugDesc}
                onClick={async () => {
                  setIsSendingBug(true);
                  try {
                    const formData = new FormData();
                    formData.append('title', bugTitle);
                    formData.append('description', bugDesc);
                    if (user?.email) formData.append('email', user.email);
                    if (selectedGame?.title) formData.append('game', selectedGame.title);
                    if (attachment) formData.append('attachment', attachment);

                    const response = await fetch('/api/bug-report', {
                      method: 'POST',
                      body: formData,
                    });
                    const result = await response.json();

                    if (result.success) {
                      showToast("Bug report sent successfully!", "bug", {
                        subtitle: `Your report for ${selectedGame?.title} has been forwarded to the dev team.`,
                        actionLabel: "View Our Games",
                        actionHref: "/#games",
                      });
                      setIsBugReportOpen(false);
                      setBugTitle('');
                      setBugDesc('');
                      setAttachment(null);
                    } else {
                      showToast(result.error || "Failed to send report. Please try again.", "error");
                    }
                  } catch (error) {
                    showToast("Failed to send report. Please try again.", "error");
                  } finally {
                    setIsSendingBug(false);
                  }
                }}
              >
                {isSendingBug ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>
                    Sending...
                  </>
                ) : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
