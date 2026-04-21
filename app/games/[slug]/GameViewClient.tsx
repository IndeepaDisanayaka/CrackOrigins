'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useModals } from '@/lib/contexts/ModalContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, User, Star, Clock, Globe, Shield, HardDrive, Monitor, ChevronRight, ChevronLeft, Send, Video, Image as ImageIcon, Download, Cpu, MemoryStick, Box, Eye, EyeOff, Copy } from 'lucide-react';
import { addGameReview, getOwnedGames, incrementDownloadCount, verifyCoupon } from '@/lib/admin-actions';
import { useToast } from '@/components/Toast';
import PayPalCheckout from '@/lib/paypal';
import CheckCircle from '@/components/CheckCircle';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Modal from '@/components/Modal';
import LiveCursors from '@/components/LiveCursors';
import styles from './GameView.module.css';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

interface GameViewClientProps {
    game: any;
    updates: any[];
    reviews: any[];
}

export default function GameViewClient({ game, updates, reviews }: GameViewClientProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isPurchased, setIsPurchased] = useState(false);
    const [purchasedDetails, setPurchasedDetails] = useState<any>(null);
    const [isKeyVisible, setIsKeyVisible] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [reviewMessage, setReviewMessage] = useState('');
    const [reviewRating, setReviewRating] = useState(10);
    const [localReviews, setLocalReviews] = useState(reviews);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(10);
    const [downloadCount, setDownloadCount] = useState(game.downloadCount || 0);
    const [isMounted, setIsMounted] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [isCouponApplied, setIsCouponApplied] = useState(false);
    const [discountValue, setDiscountValue] = useState(0);
    const [isAgreed, setIsAgreed] = useState(false);
    const [appliedCouponId, setAppliedCouponId] = useState('');
    const [isVerifyingCoupon, setIsVerifyingCoupon] = useState(false);

    const { 
        isAuthModalOpen, setIsAuthModalOpen, 
        isAdminModalOpen, setIsAdminModalOpen,
        isCouponModalOpen, setIsCouponModalOpen,
        isAddOfferModalOpen, setIsAddOfferModalOpen,
        isListGameOpen, setIsListGameOpen,
        isDispatchModalOpen, setIsDispatchModalOpen
    } = useModals();

    useEffect(() => {
        setIsMounted(true);
    }, []);
    const mediaItems = [
        ...(game.video && game.showVideo !== false && game.showVideo !== 'false' ? [{ type: 'video', id: game.video }] : []),
        ...(game.images || []).map((url: string) => ({ type: 'image', url }))
    ].filter(item => item.id || item.url);

    // If no media items were set up properly (e.g., missing images array and no video), inject fallback
    if (mediaItems.length === 0) {
        mediaItems.push({ type: 'image', url: game.image || '/placeholder-game.png' });
    }

    useEffect(() => {
        if (user) {
            const checkPurchase = async () => {
                const res = await getOwnedGames(user.uid);
                if (res.success && res.games?.includes(game.title)) {
                    setIsPurchased(true);
                    setPurchasedDetails(res.details?.[game.title] || null);
                }
            };
            checkPurchase();
        }
    }, [user, game.title]);

    const handleAddReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            showToast('Please connect to leave a review.', 'error');
            return;
        }
        if (!reviewMessage.trim()) return;

        const res = await addGameReview(game.id, {
            userId: user.uid,
            userName: user.displayName || 'Operator',
            userPhoto: user.photoURL || '',
            rating: `${reviewRating}/10`,
            message: reviewMessage
        });

        if (res.success) {
            showToast('Review posted!', 'success');
            const newReview = {
                id: user.uid,
                userName: user.displayName || 'Operator',
                userPhoto: user.photoURL || '',
                rating: `${reviewRating}/10`,
                message: reviewMessage,
                time: new Date().toISOString()
            };
            
            setLocalReviews((prev: any[]) => {
                const existingIndex = prev.findIndex(r => r.id === user.uid);
                if (existingIndex > -1) {
                    const next = [...prev];
                    next[existingIndex] = newReview;
                    return next;
                }
                return [newReview, ...prev];
            });
            setReviewMessage('');
        } else {
            showToast('Failed to post review.', 'error');
        }
    };

    const handleDownload = async () => {
        if (!game.downloadUrl) return;
        setDownloadCount((prev: number) => prev + 1);
        incrementDownloadCount(game.id);
        window.open(game.downloadUrl, '_blank');
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setIsVerifyingCoupon(true);
        const res = await verifyCoupon(couponCode);
        setIsVerifyingCoupon(false);

        if (res.success) {
            setIsCouponApplied(true);
            const discountNum = parseInt(res.discount.replace('%', ''));
            setDiscountValue(discountNum);
            setAppliedCouponId(res.couponId || '');
            showToast(`Coupon applied! ${res.discount} discount activated.`, 'success');
        } else {
            showToast(res.error || 'Invalid coupon.', 'error');
        }
    };

    const finalPrice = isCouponApplied 
        ? (Number(game.price) * (1 - discountValue / 100)).toFixed(2)
        : Number(game.price).toFixed(2);

    const nextMedia = () => setCurrentMediaIndex((prev: number) => (prev + 1) % mediaItems.length);
    const prevMedia = () => setCurrentMediaIndex((prev: number) => (prev === 0 ? mediaItems.length - 1 : prev - 1));

    const formatDate = (date: any) => {
        if (!isMounted) return "";
        return new Date(date).toLocaleDateString();
    };

    const formatTime = (date: any) => {
        if (!isMounted) return "";
        const d = new Date(date);
        return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div className={styles.container}>
            <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
            <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
            <LiveCursors />

            <main className={styles.main}>
                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={() => {}} />
                <CouponModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} />
                <AddOfferModal isOpen={isAddOfferModalOpen} onClose={() => setIsAddOfferModalOpen(false)} />
                <ListGameModal isOpen={isListGameOpen} onClose={() => setIsListGameOpen(false)} />
                <DispatchModal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} />
                
                <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} maxWidth="510px">
                    <div className={styles.checkoutModal} style={{ paddingTop: 0, padding: '2rem' }}>
                        <h2 className={styles.screenshotModalTitle}>GAME DETAILS</h2>
                        <div className={styles.screenshotModalHeader}>
                            <div style={{ width: '80px', height: '110px', position: 'relative', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                <Image src={game.image || '/placeholder-game.png'} alt={game.title} fill style={{ objectFit: 'cover' }} />
                            </div>
                            <div className={styles.screenshotModalHeaderInfo}>
                                <span className={styles.screenshotGameTitle}>{game.title}</span>
                                {purchasedDetails?.purchaseDate && (
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Purchased on: {new Date(purchasedDetails.purchaseDate).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>

                        <div className={styles.screenshotKeyContainer}>
                            <span className={styles.screenshotKeyLabel}>ACTIVATION KEY</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div className={styles.screenshotKeyBox}>
                                    {isKeyVisible ? (purchasedDetails?.activationKey || 'NO-KEY-FOUND') : '••••••••••••••••••••••••'}
                                </div>
                                <button className={styles.screenshotVisibilityBtn} onClick={() => setIsKeyVisible(!isKeyVisible)}>
                                    {isKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button className={styles.screenshotCopyBtn} onClick={() => { 
                                    if (purchasedDetails?.activationKey) {
                                        navigator.clipboard.writeText(purchasedDetails.activationKey);
                                        showToast("Activation key copied to clipboard!", "success");
                                    }
                                }}>
                                    <Copy size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={{ marginTop: '2.5rem' }}>
                            <button className={styles.screenshotFooterBtn} onClick={() => setIsDetailsModalOpen(false)}>BACK TO HUB</button>
                        </div>
                    </div>
                </Modal>

                {user && <AdminPanel userUid={user.uid} isOpen={isAdminModalOpen} setIsOpen={setIsAdminModalOpen} />}

                {/* Hero Section */}
                <section className={styles.hero}>
                    <div className={styles.heroBackground}>
                        <Image src={mediaItems.find(m => m.type === 'image')?.url || '/placeholder-game.png'} alt={game.title} fill className={styles.heroBgImg} priority />
                        <div className={styles.heroOverlay} />
                    </div>

                    <div className={styles.heroContent}>
                        <div className={styles.heroGrid}>
                            <div className={styles.heroMain}>
                                <div className={styles.breadcrumb}>
                                    <Link href="/" style={{ color: 'inherit' }}>Home</Link> 
                                    <ChevronRight size={12} /> 
                                    <span>Creations</span> 
                                    <ChevronRight size={12} /> 
                                    <span style={{ color: 'var(--foreground)' }}>{game.title}</span>
                                </div>
                                <h1 className={styles.title}>{game.title}</h1>
                                <p className={styles.tagline}>{game.description}</p>

                                <div className={styles.meta}>
                                    <div className={styles.metaItem}>
                                        <Download size={16} color="var(--primary)" />
                                        <span>{downloadCount.toLocaleString()} TRANSFERS</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <Clock size={16} color="var(--primary)" />
                                        <span>LISTED {formatDate(game.time)}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <Globe size={16} color="var(--primary)" />
                                        <span>{Array.isArray(game.os) ? game.os.join(' / ') : game.os}</span>
                                    </div>
                                </div>
                            </div>

                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={styles.purchaseCard}>
                                 {!isPurchased && (
                                    <div className={styles.priceRow}>
                                        <span className={styles.priceLabel}>Access Protocol</span>
                                        <span className={styles.priceValue}>
                                            {game.price === 0 || game.price === 'Free' ? 'FREE' : `$${finalPrice}`}
                                            {isCouponApplied && <span style={{ fontSize: '0.8rem', color: '#ff4444', textDecoration: 'line-through', marginLeft: '0.5rem', fontWeight: 600 }}>${game.price}</span>}
                                        </span>
                                    </div>
                                )}

                                {game.status === 'coming-soon' ? (
                                    <div className={styles.comingSoonBadge} style={{ background: 'rgba(254, 182, 12, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '1.5rem', textAlign: 'center', fontWeight: 900, textTransform: 'uppercase', marginBottom: '2rem' }}>
                                        Deployment Pending - Coming Soon
                                    </div>
                                ) : (
                                    <>
                                        {!isPurchased && game.price > 0 && game.price !== 'Free' && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                                                {/* Premium Coupon Input */}
                                                <div style={{ 
                                                    display: 'flex', 
                                                    height: '50px', 
                                                    background: 'transparent', 
                                                    border: '1px solid rgba(var(--foreground-rgb), 0.1)', 
                                                    borderRadius: '4px', 
                                                    overflow: 'hidden',
                                                    width: '100%'
                                                }}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="COUPON CODE" 
                                                        style={{ 
                                                            flex: 1, 
                                                            minWidth: 0,
                                                            background: 'transparent', 
                                                            border: 'none', 
                                                            padding: '0 1rem', 
                                                            fontSize: '0.8rem', 
                                                            fontWeight: 800, 
                                                            letterSpacing: '1px',
                                                            color: 'var(--foreground)',
                                                            outline: 'none',
                                                            textTransform: 'uppercase'
                                                        }}
                                                        value={couponCode}
                                                        onChange={(e) => setCouponCode(e.target.value)}
                                                        disabled={isCouponApplied || isVerifyingCoupon}
                                                    />
                                                    <button 
                                                        className="btnSolid" 
                                                        style={{ 
                                                            height: '100%', 
                                                            borderRadius: 0, 
                                                            padding: '0 1.5rem', 
                                                            fontSize: '0.85rem', 
                                                            fontWeight: 950,
                                                            background: 'var(--primary)',
                                                            color: '#000',
                                                            border: 'none',
                                                            flexShrink: 0,
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onClick={handleApplyCoupon}
                                                        disabled={isCouponApplied || isVerifyingCoupon}
                                                    >
                                                        {isVerifyingCoupon ? '...' : (isCouponApplied ? 'READY' : 'APPLY')}
                                                    </button>
                                                </div>

                                                {/* Premium Terms Box */}
                                                <div 
                                                    onClick={() => setIsAgreed(!isAgreed)}
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.85rem', 
                                                        padding: '1rem', 
                                                        background: 'rgba(var(--foreground-rgb), 0.02)', 
                                                        border: '1px solid rgba(var(--foreground-rgb), 0.08)', 
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        width: '100%'
                                                    }}
                                                >
                                                    <CheckCircle checked={isAgreed} onChange={setIsAgreed} />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)', opacity: 0.9, lineHeight: 1.3 }}>
                                                        I agree to the <Link href="/terms" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }} onClick={(e) => e.stopPropagation()}>Terms of Service</Link> for this purchase.
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className={styles.paypalWrapper} style={{ position: 'relative' }}>
                                            {(!isPurchased && game.price > 0 && game.price !== 'Free' && !isAgreed) && (
                                                <div 
                                                    style={{ 
                                                        position: 'absolute', 
                                                        inset: 0, 
                                                        zIndex: 50, 
                                                        cursor: 'pointer',
                                                        background: 'transparent',
                                                        pointerEvents: 'auto'
                                                    }} 
                                                    onClick={() => showToast("Security Protocol: Please accept the Terms of Service to proceed.", "error")}
                                                />
                                            )}
                                            
                                            {isPurchased || game.price === 0 || game.price === 'Free' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                                                    <button className="btnSolid" style={{ width: '100%', gap: '0.75rem' }} onClick={handleDownload}>
                                                        <Download size={18} /> INITIALIZE DOWNLOAD
                                                    </button>
                                                    {isPurchased && (
                                                        <button className="btnOutline" style={{ width: '100%', gap: '0.75rem', fontWeight: 900 }} onClick={() => setIsDetailsModalOpen(true)}>
                                                            <Shield size={18} /> VIEW ACTIVATION KEY
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ opacity: isAgreed ? 1 : 0.3, pointerEvents: isAgreed ? 'auto' : 'none', transition: 'opacity 0.3s ease' }}>
                                                    <PayPalCheckout 
                                                        amount={finalPrice} 
                                                        game={game.title} 
                                                        gameId={game.id}
                                                        isOwned={false} 
                                                        onSuccess={() => setIsPurchased(true)} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                                
                                <p className={styles.cardInfo}>
                                    {isPurchased ? "Digital license verified for this machine." : "Secure encryption and instant license delivery."}
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <div className={styles.contentGrid}>
                    <div className={styles.leftCol}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Archives & Logistics</h2>
                            <div className={styles.carousel}>
                                <div className={styles.mainMediaWrapper}>
                                    <div className={styles.mainMediaContainer}>
                                        {mediaItems[currentMediaIndex].type === 'video' ? (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${mediaItems[currentMediaIndex].id}?autoplay=1&mute=1&modestbranding=1&rel=0`}
                                                className={styles.activeIframe}
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <Image src={mediaItems[currentMediaIndex].url!} alt={`${game.title} Visual`} fill className={styles.mainGalleryImg} />
                                        )}
                                    </div>
                                    <button onClick={prevMedia} className={styles.carouselBtn} style={{ left: '0' }}><ChevronLeft size={24} /></button>
                                    <button onClick={nextMedia} className={styles.carouselBtn} style={{ right: '0' }}><ChevronRight size={24} /></button>
                                </div>
                                <div className={styles.thumbnails}>
                                    {mediaItems.map((item, idx) => (
                                        <div key={idx} className={`${styles.thumb} ${idx === currentMediaIndex ? styles.activeThumb : ''}`} onClick={() => setCurrentMediaIndex(idx)}>
                                            {item.type === 'video' ? (
                                                <>
                                                    <Image src={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`} alt="Video" fill className={styles.thumbImg} />
                                                    <div className={styles.thumbOverlay} style={{ opacity: 1 }}><Video size={20} color="var(--primary)" /></div>
                                                </>
                                            ) : (
                                                <Image src={item.url!} alt="Screenshot" fill className={styles.thumbImg} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Field Operations & Intel</h2>
                            {updates.length > 0 ? (
                                <div className={styles.updatesList}>
                                    {updates.map((update) => (
                                        <Link key={update.id} href={`/games/${game.slug}/updates/${update.slug}`} className={styles.updateCard}>
                                            <div className={styles.updateHeader}>
                                                <div className={styles.updateImgWrapper}>
                                                    <Image src={update.image || game.logo || '/placeholder-game.png'} alt={update.title} fill className={styles.updateImg} />
                                                </div>
                                                <div className={styles.updateTitleRow}>
                                                    <span className={styles.updateDate}>{formatDate(update.date)}</span>
                                                    <h3 className={styles.updateTitle}>{update.title}</h3>
                                                </div>
                                            </div>
                                            <p className={styles.updateDesc}>{update.description}</p>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>No tactical updates available at this time.</div>
                            )}
                        </section>
                    </div>

                    <div className={styles.rightCol}>
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>System Clearance</h2>
                            <div className={styles.reqGrid}>
                                <div className={styles.reqBlock}>
                                    <span className={styles.reqLabel}>Minimum Operational Spec</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <div className={styles.reqValue}><Cpu size={14} color="var(--primary)" /> {game.requirements.min.processor}</div>
                                        <div className={styles.reqValue}><MemoryStick size={14} color="var(--primary)" /> {game.requirements.min.memory}</div>
                                        <div className={styles.reqValue}><Monitor size={14} color="var(--primary)" /> {game.requirements.min.graphics}</div>
                                        <div className={styles.reqValue}><Box size={14} color="var(--primary)" /> {game.requirements.min.storage}</div>
                                        <div className={styles.reqValue} style={{ color: game.requirements.min.vrSupported ? 'var(--primary)' : 'inherit' }}>
                                            <Globe size={14} /> VR: {game.requirements.min.vrSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.reqBlock} style={{ borderLeftColor: 'var(--foreground)' }}>
                                    <span className={styles.reqLabel}>Recommended Operational Spec</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        <div className={styles.reqValue}><Cpu size={14} color="var(--primary)" /> {game.requirements.max.processor}</div>
                                        <div className={styles.reqValue}><MemoryStick size={14} color="var(--primary)" /> {game.requirements.max.memory}</div>
                                        <div className={styles.reqValue}><Monitor size={14} color="var(--primary)" /> {game.requirements.max.graphics}</div>
                                        <div className={styles.reqValue}><Box size={14} color="var(--primary)" /> {game.requirements.max.storage}</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Operator Feedback</h2>
                            {user ? (
                                <form onSubmit={handleAddReview} className={styles.reviewForm}>
                                    <span className={styles.reviewFormTitle}>Submit Evaluation</span>
                                    <div className={styles.ratingInput}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 900 }}>
                                            <span>RATING</span>
                                            <span style={{ color: 'var(--primary)' }}>{reviewRating}/10</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', padding: '1rem' }}>
                                            {[...Array(10)].map((_, i) => (
                                                <motion.button key={i} type="button" whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} className={styles.starBtn} data-active={reviewRating >= i + 1} onClick={() => setReviewRating(i + 1)}>
                                                    <Star size={24} fill={reviewRating >= i + 1 ? "var(--primary)" : "transparent"} color={reviewRating >= i + 1 ? "var(--primary)" : "var(--foreground)"} />
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea placeholder="Enter operator report..." className={styles.reviewTextarea} value={reviewMessage} onChange={(e) => setReviewMessage(e.target.value)} rows={4} />
                                    <button type="submit" className="btnSolid" style={{ width: '100%' }}>Transmit Review <Send size={14} /></button>
                                </form>
                            ) : (
                                <div className={styles.loginPrompt}>Standard authentication required for reporting.</div>
                            )}

                            <div className={styles.reviewsList}>
                                {localReviews.slice(0, visibleReviewsCount).map((review, idx) => (
                                    <div key={idx} className={styles.reviewCard}>
                                        <div className={styles.reviewHeader}>
                                            <div className={styles.reviewerId}>
                                                {review.userPhoto ? (
                                                    <Image src={review.userPhoto} alt={review.userName || 'User'} width={24} height={24} className={styles.reviewerImg} />
                                                ) : (
                                                    <User size={14} color="var(--primary)" /> 
                                                )}
                                                <span style={{ fontWeight: 900, color: 'var(--foreground)' }}>{review.userName || `OPERATOR-${review.id ? review.id.substring(0, 6).toUpperCase() : 'UNKNOWN'}`}</span>
                                            </div>
                                            <div className={styles.reviewRating}>
                                                {[...Array(10)].map((_, i) => {
                                                    const ratingNum = parseInt(review.rating?.split('/')[0] || "0");
                                                    return <Star key={i} size={10} fill={i < ratingNum ? "var(--primary)" : "transparent"} color={i < ratingNum ? "var(--primary)" : "var(--foreground)"} />;
                                                })}
                                            </div>
                                        </div>
                                        <p className={styles.reviewMsg}>{review.message}</p>
                                        <span className={styles.reviewTime}>{formatTime(review.time)}</span>
                                    </div>
                                ))}
                                {visibleReviewsCount < localReviews.length && (
                                    <button className="btnOutline" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} onClick={() => setVisibleReviewsCount(prev => prev + 10)}>DOWNLOAD MORE FEEDBACK</button>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
