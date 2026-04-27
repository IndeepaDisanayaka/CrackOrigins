'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Shield, Clock, CheckCircle2, User as UserIcon, TrendingUp, Share2 } from 'lucide-react';
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
import { getGlobalOffers, getGiveawayLeaderboard } from '@/lib/live-actions';
import { revealVariants, staggerContainer, STEAM_SVG, WINDOWS_SVG } from '../../lib/constants';
import styles from '../ExtraSections.module.css';
import carouselStyles from '../GamesCarousel.module.css';

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
                    <a 
                        href={game.steamAppId ? `steam://store/${game.steamAppId}` : game.steamUrl} 
                        className="btnOutline" 
                        style={{ width: '100%', textAlign: 'center', justifyContent: 'center', textDecoration: 'none' }}
                    >
                        View on Steam
                    </a>
                </div>
            </div>
        </motion.div>
    );
}

function GlobalSteamCard({ 
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

    useEffect(() => {
        if (!user?.uid || !isFree || !game.listed) return;
        const fetchProgress = async () => {
            try {
                const res = await getAffiliateProgress(user.uid, game.listed);
                if (res.success) {
                    const count = res.count || 0;
                    const target = Number(game.targetAffiliates || 10);
                    const progress = Math.min(100, Math.floor((count / target) * 100));
                    setAccumulatedDiscount(progress);
                }
            } catch (err) {}
        };
        fetchProgress();
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
        showToast("Invite link copied!", "success");
    };

    const progress = isFree ? accumulatedDiscount : 100;

    return (
        <motion.div 
            style={{ 
                gridColumn: '1 / -1',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                overflow: 'hidden',
                background: 'var(--background)',
                border: '1px solid var(--outline-color)',
                marginBottom: '2rem',
                minHeight: '300px'
            }}
            variants={revealVariants}
        >
            <div style={{ flex: '1 1 400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRight: '1px solid var(--outline-color)' }}>
                <div>
                    <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>Community Goal</span>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--foreground)', marginTop: '0.75rem', textTransform: 'uppercase' }}>{game.title}</h3>
                </div>

                <div style={{ height: '10px', background: 'var(--outline-color)', borderRadius: '50px', position: 'relative', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5 }}
                        style={{ height: '100%', background: 'var(--primary)', borderRadius: '50px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btnSolid" onClick={handleCopyAffiliateLink}
                        style={{ flex: 1, background: 'var(--primary)', color: '#000', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', minWidth: '150px' }}
                    >
                        Invite Friends
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="btnOutline" onClick={() => { setSelectedSteamGame(game); setModalState('idle'); }}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', minWidth: '150px' }}
                    >
                        Details
                    </motion.button>
                </div>
            </div>
            <div style={{ flex: '0.6 1 300px', position: 'relative', minHeight: '200px' }}>
                <img src={game.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--background) 0%, transparent 100%)' }} />
            </div>
        </motion.div>
    );
}

function GiveawayLeaderboard({ game, affiliateId }: { game: any, affiliateId: string | null }) {
    const { showToast } = useToast();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [totalFilled, setTotalFilled] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!game || !game.listed) return;
        
        const fetchBoard = async () => {
            try {
                const res = await getGiveawayLeaderboard(game.targetAffiliates || 10, game.listed);
                if (res.success) {
                    setLeaderboard(res.topUsers);
                    setTotalFilled(res.totalFilled);
                }
            } catch (err) {}
            setLoading(false);
        };

        fetchBoard();
        const interval = setInterval(fetchBoard, 60000);
        return () => clearInterval(interval);
    }, [game]);

    const handleCopyAffiliateLink = () => {
        if (!affiliateId) {
            showToast("Login to get your affiliate link!", "error");
            return;
        }
        const link = `${window.location.origin}/?ref=${affiliateId}`;
        navigator.clipboard.writeText(link);
        showToast("Invite link copied! Share it to get recruits.", "success");
    };

    if (!game) return null;

    const remaining = Math.max(0, game.quantity - totalFilled);
    const progress = Math.min(100, (totalFilled / (game.targetAffiliates || 10)) * 100);

    return (
        <motion.div 
            className={styles.steamCard}
            style={{ 
                gridColumn: '1 / -1', 
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '4rem',
                background: 'var(--background)',
                border: '1px solid var(--outline-color)',
                minHeight: '600px',
                padding: '4rem 2rem'
            }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
        >
            {/* Centered Info Section */}
            <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.5rem', position: 'relative', textAlign: 'center', marginBottom: '3rem' }}>
                <div style={{ position: 'absolute', top: '-4rem', left: '50%', transform: 'translateX(-50%)', width: '100vw', height: '100%', opacity: 0.05, pointerEvents: 'none', zIndex: 0 }}>
                    <img src={game.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 0%, var(--background) 70%)' }} />
                </div>

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <motion.span 
                        whileHover={{ scale: 1.05 }}
                        style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '0.5rem 1.5rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', border: '1px solid rgba(var(--primary-rgb), 0.3)' }}
                    >
                        <TrendingUp size={14} /> Global Community Giveaway
                    </motion.span>
                    <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, lineHeight: 1, color: 'var(--foreground)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '-0.05em' }}>
                        Grow the Tribe, <span style={{ color: 'var(--primary)' }}>Grab the Game</span>
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '650px', margin: 0 }}>
                        Join forces with the community to unlock <strong style={{ color: 'var(--foreground)' }}>{game.title}</strong> for everyone. 
                        Contribute your points or invite friends to fill the global vault.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 1, justifyContent: 'center' }}>
                    <motion.button 
                        whileHover={{ translateY: -3, boxShadow: '0 15px 30px rgba(var(--primary-rgb), 0.3)' }} whileTap={{ scale: 0.98 }}
                        onClick={() => { /* Points logic */ }}
                        style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '1.2rem 2.5rem', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                    >
                        <TrendingUp size={20} /> Invest My Points
                    </motion.button>
                    <motion.button 
                        whileHover={{ background: 'rgba(var(--primary-rgb), 0.1)', translateY: -3 }} whileTap={{ scale: 0.98 }}
                        onClick={handleCopyAffiliateLink}
                        style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '1.2rem 2.5rem', borderRadius: '12px', fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                    >
                        <Share2 size={20} /> Invite Friends
                    </motion.button>
                </div>

                <div style={{ display: 'flex', gap: '4rem', position: 'relative', zIndex: 1, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>{totalFilled}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.15em', marginTop: '0.5rem' }}>Global Recruits</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1, animation: 'timerPulse 1.5s infinite' }}>{remaining}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.15em', marginTop: '0.5rem' }}>Keys Remaining</div>
                    </div>
                </div>
            </div>

            {/* Centered Visual Progress & Leaderboard */}
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center' }}>
                <div style={{ width: '100%', maxWidth: '700px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--foreground)', margin: 0 }}>Progress Vault</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Community Milestone</span>
                        </div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--primary)' }}>{Math.floor(progress)}%</div>
                    </div>

                    <div style={{ height: '14px', background: 'var(--outline-color)', borderRadius: '50px', position: 'relative', overflow: 'hidden' }}>
                        <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            style={{ height: '100%', background: 'var(--primary)', borderRadius: '50px', position: 'relative' }}
                        >
                            <div className={styles.glowEffect} style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                        </motion.div>
                        {[25, 50, 75].map(m => (
                            <div key={m} style={{ position: 'absolute', top: '50%', left: `${m}%`, transform: 'translate(-50%, -50%)', width: '4px', height: '100%', background: 'rgba(var(--background-rgb), 0.2)', zIndex: 3 }} />
                        ))}
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', textAlign: 'center' }}>Top Field Agents</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', width: '100%' }}>
                        {loading ? (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Retrieving leaderboard data...</div>
                        ) : leaderboard.length > 0 ? (
                            leaderboard.slice(0, 4).map((u, i) => (
                                <motion.div 
                                    key={u.uid} 
                                    whileHover={{ x: 5, background: 'rgba(var(--primary-rgb), 0.05)' }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.8rem 1.25rem', borderRadius: '12px', background: 'rgba(var(--foreground-rgb), 0.03)', border: '1px solid rgba(var(--foreground-rgb), 0.05)' }}
                                >
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--background)', border: '1px solid var(--outline-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? '#000' : 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 900 }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, color: 'var(--foreground)' }}>{u.name}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Level {Math.floor(u.count / 5) + 1} Agent</span>
                                    </div>
                                    <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>{u.count}</div>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(var(--foreground-rgb), 0.02)', borderRadius: '12px', border: '1px dashed var(--outline-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No contributions yet. Be the first to start the vault!
                            </div>
                        )}
                    </div>
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
              steamAppId: steamAppId,
              offerScope: data.offerScope || 'local',
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
        {(() => {
            // The top section is reserved for FREE giveaways (Community Goals)
            const mainGiveaway = steamGames.find(g => g.offerScope === 'global' && parseFloat(g.discountPrice.replace('$', '')) === 0) || 
                               steamGames.find(g => parseFloat(g.discountPrice.replace('$', '')) === 0);
            
            if (!mainGiveaway) return null;
            return <GiveawayLeaderboard game={mainGiveaway} affiliateId={affiliateId} />;
        })()}

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
          (() => {
            const mainGiveaway = steamGames.find(g => g.offerScope === 'global' && parseFloat(g.discountPrice.replace('$', '')) === 0) || 
                               steamGames.find(g => parseFloat(g.discountPrice.replace('$', '')) === 0);
            
            // Filter out the one already shown at the top
            const remainingGames = steamGames.filter(game => game.id !== mainGiveaway?.id);
            
            return (showAll ? remainingGames : remainingGames.slice(0, 3))
              .map((game) => {
                if (game.offerScope === 'global') {
                    return (
                        <GlobalSteamCard 
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
                    );
                }
                return (
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
                );
              });
          })()
        )}
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
