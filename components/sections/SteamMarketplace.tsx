'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Shield, Clock, CheckCircle2, User as UserIcon, TrendingUp, Users, RefreshCw } from 'lucide-react';


import Link from 'next/link';
import Image from 'next/image';
import { collection, onSnapshot} from "firebase/firestore";
import { fireStore } from "../../lib/firebase";
import { getUserKey, getAffiliateProgress, investXP } from '@/lib/admin-actions';
import { capturePayPalOrder } from '@/lib/paypal-actions';



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
    handleInvestClick: (game: any) => void;
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
    setOfferPayLock,
    handleInvestClick
}: SteamCardProps) {

    const { showToast } = useToast();
    const isFree = parseFloat(game.discountPrice.replace('$', '')) === 0;
    const [accumulatedDiscount, setAccumulatedDiscount] = useState(isFree ? 0 : 100);
    const [isClaiming, setIsClaiming] = useState(false);

    const handleDirectClaim = async () => {
        if (!user || isClaiming) return;
        setIsClaiming(true);
        try {
            const result = await capturePayPalOrder("FREE_CLAIM_" + Date.now(), user.uid, game.title, "0.00", undefined, game.id, game.id);
            if (result.success) {
                showToast(`Success! ${game.title} has been added to your pending claims. Our team will verify it soon.`, "success");
            } else {
                showToast(result.error || "Failed to claim reward.", "error");
            }
        } catch (e) {
            showToast("An error occurred during claiming.", "error");
        } finally {
            setIsClaiming(false);
        }
    };


    // Track actual affiliates recruited since the offer was listed
    useEffect(() => {
        if (!user?.uid || !isFree || !game.listed) return;

        const listedDate = new Date(game.listed);
        if (isNaN(listedDate.getTime())) return;

        // Fallback to Server Action to avoid Permission Denied on subcollections
        const fetchProgress = async () => {
            try {
                const res = await getAffiliateProgress(user.uid, game.listed, game.id);
                if (res.success) {
                    const count = res.count || 0;
                    const target = Number(game.targetXP || game.targetAffiliates || 10);
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
    }, [user?.uid, game.id, game.listed, isFree, game.targetXP]);




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
                            <span className={styles.discountFillLabel}>Investment Progress</span>
                            <span className={styles.discountFillValue}>{accumulatedDiscount}%</span>
                        </div>
                        <div className={styles.discountFillBar}>
                            <div className={styles.discountFillProgress} style={{ width: `${accumulatedDiscount}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: 0 }}>
                                {accumulatedDiscount < 100 ? "Invest XP before it's gone!" : "Goal Reached! Claim now."}
                            </p>
                            <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.9 }}>
                                {accumulatedDiscount >= 100 ? (game.targetXP || 50) : Math.floor((accumulatedDiscount / 100) * (game.targetXP || 50))} / {game.targetXP || 50} XP
                            </span>
                        </div>
                    </div>
                )}

                <div className={styles.steamActions}>
                    <div className={styles.keyContainer}>
                        {(() => {
                            const purchasedOffer = purchasedOffers[game.id];
                            const hasPurchased = purchasedOffer?.status === 'COMPLETED';

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

                                if (isFree) {
                                    if (accumulatedDiscount >= 100) {
                                        return (
                                            <>
                                                <button 
                                                    className={styles.btnUnlock} 
                                                    onClick={handleDirectClaim}
                                                    disabled={isClaiming}
                                                    style={{ width: '100%', justifyContent: 'center', gap: '0.8rem', background: 'var(--primary)', color: '#000', fontWeight: 900 }}
                                                >
                                                    {isClaiming ? <RefreshCw className="spin" size={16} /> : <ShoppingCart size={16} />}
                                                    {isClaiming ? ' CLAIMING...' : ' CLAIM FREE REWARD'}
                                                </button>
                                            </>
                                        );
                                    } else {
                                        return (
                                            <>
                                                <button className={styles.btnUnlock} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', animation: 'timerPulse 1.5s ease-in-out infinite' }} onClick={() => handleInvestClick(game)}>
                                                    <TrendingUp size={16} /> INVEST XP ({game.quantity} LEFT)
                                                </button>
                                            </>
                                        );
                                    }
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
    setOfferPayLock,
    handleInvestClick
}: SteamCardProps) {

    const { showToast } = useToast();
    const isFree = parseFloat(game.discountPrice.replace('$', '')) === 0;
    const [accumulatedDiscount, setAccumulatedDiscount] = useState(isFree ? 0 : 100);
    const [globalTotal, setGlobalTotal] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isClaiming, setIsClaiming] = useState(false);

    const handleWinnerClaim = async () => {
        if (!user || isClaiming) return;
        setIsClaiming(true);
        try {
            const result = await capturePayPalOrder("FREE_CLAIM_WINNER_" + Date.now(), user.uid, game.title, "0.00", undefined, game.id, game.id);
            if (result.success) {
                showToast(`Success! You have claimed your reward for ${game.title}. Our team will verify it soon.`, "success");
            } else {
                showToast(result.error || "Failed to claim reward.", "error");
            }
        } catch (e) {
            showToast("An error occurred during claiming.", "error");
        } finally {
            setIsClaiming(false);
        }
    };




    useEffect(() => {
        if (!isFree || !game.listed) return;
        const fetchProgress = async () => {
            try {
                const res = await getGiveawayLeaderboard(game.targetXP || 50, game.listed, game.id);
                if (res.success) {
                    const total = res.totalFilled || 0;
                    const target = Number(game.targetXP || game.targetAffiliates || 50);
                    const progress = Math.min(100, Math.floor((total / target) * 100));
                    setAccumulatedDiscount(progress);
                    setGlobalTotal(total);
                    setLeaderboard(res.topUsers || []);

                }

            } catch (err) {}
        };
        fetchProgress();
        const interval = setInterval(fetchProgress, 60000);
        return () => clearInterval(interval);
    }, [game.id, game.listed, isFree, game.targetXP]);

    const globalXP = globalTotal;



    const progress = isFree ? accumulatedDiscount : 100;

    return (
        <motion.div 
            className={styles.globalSteamCard}
            style={{ 
                gridColumn: '1 / -1',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'var(--background)',
                border: '1px solid var(--outline-color)',
                marginBottom: '2rem',
                minHeight: '300px'
            }}
            variants={revealVariants}
        >
            <div className={styles.globalSteamLeft} style={{ flex: '1 1 400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>Community Goal</span>
                        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--foreground)', marginTop: '0.75rem', textTransform: 'uppercase' }}>{game.title}</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <CountdownTimer endTime={game.endTime} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                             <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>Retail Value:</span>
                             <span style={{ fontSize: '1.1rem', fontWeight: 900, textDecoration: 'line-through', color: '#ff4d4d' }}>{game.originalPrice || '$59.99'}</span>
                        </div>
                    </div>
                </div>


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase' }}>Global Goal Progress</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)' }}>{globalXP} / {game.targetXP || 50} XP</span>
                </div>


                <div style={{ height: '10px', background: 'var(--outline-color)', borderRadius: '50px', position: 'relative', overflow: 'hidden' }}>
                    <motion.div 
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5 }}
                        style={{ height: '100%', background: 'var(--primary)', borderRadius: '50px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {(() => {
                        const purchasedOffer = purchasedOffers[game.id];
                        const hasPurchased = purchasedOffer?.status === 'COMPLETED';


                        if (hasPurchased) {
                            if (purchasedOffer.steamKey) {
                                return (
                                    <div className={styles.keyContainer} style={{ width: '100%', flex: 1 }}>
                                        <div className={styles.hiddenKey}>{showKeys[game.id] ? (decryptedKeys[game.id] || 'Retrieving...') : '••••••••••'}</div>
                                        <button className={styles.btnUnlock} disabled={isFetchingKey[game.id]} onClick={() => handleShowKey(game.id)}>
                                            {isFetchingKey[game.id] ? 'WAIT...' : (showKeys[game.id] ? 'HIDE' : 'SHOW')}
                                        </button>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className={styles.keyContainer} style={{ width: '100%', flex: 1 }}>
                                        <div className={styles.hiddenKey} style={{ fontSize: '0.8rem' }}>PENDING VERIFICATION</div>
                                        <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                            <Clock size={16} /> PENDING
                                        </button>
                                    </div>
                                );
                            }
                        }

                        if (progress >= 100) {
                            const isWinner = leaderboard[0]?.uid === user?.uid;
                            if (isWinner) {
                                return (
                                    <motion.button 
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        className={styles.btnUnlock} 
                                        onClick={handleWinnerClaim}
                                        disabled={isClaiming}
                                        style={{ flex: 1, background: 'var(--primary)', color: '#000', border: 'none', padding: '1rem', borderRadius: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        {isClaiming ? <RefreshCw className="spin" size={16} /> : <ShoppingCart size={16} />}
                                        {isClaiming ? ' CLAIMING...' : ' CLAIM WINNER REWARD'}
                                    </motion.button>
                                );
                            } else {
                                return (
                                    <motion.button 
                                        className="btnSolid" 
                                        disabled
                                        style={{ flex: 1, padding: '0.8rem', opacity: 0.5, cursor: 'not-allowed', borderRadius: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <CheckCircle2 size={16} /> GOAL REACHED
                                    </motion.button>
                                );
                            }
                        }

                        return (
                            <motion.button 
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                className="btnSolid" onClick={() => handleInvestClick(game)}
                                style={{ flex: 1, background: 'var(--primary)', color: '#000', border: 'none', padding: '0.8rem', borderRadius: '8px', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem', minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <TrendingUp size={16} /> Invest XP
                            </motion.button>
                        );
                    })()}

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
                <motion.div className={styles.discountBadge} style={{ position: 'absolute', top: '1rem', right: '1rem' }} whileHover={{ scale: 1.1, rotate: 2 }}>GIVEAWAY</motion.div>
            </div>

        </motion.div>
    );
}

function GiveawayLeaderboard({ 
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
    setOfferPayLock,
    handleInvestClick 
}: { 
    game: any, 
    user: any, 
    affiliateId: string | null, 
    purchasedOffers: any,
    showKeys: any,
    decryptedKeys: any,
    isFetchingKey: any,
    handleShowKey: (id: string) => void,
    setSelectedSteamGame: (game: any) => void, 
    setModalState: (state: any) => void, 
    setOfferPayLock: (lock: any) => void,
    handleInvestClick: (game: any) => void 
}) {


    const { showToast } = useToast();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [totalFilled, setTotalFilled] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);

    const handleWinnerClaim = async () => {
        if (!user || isClaiming) return;
        setIsClaiming(true);
        try {
            const result = await capturePayPalOrder("FREE_CLAIM_WINNER_" + Date.now(), user.uid, game.title, "0.00", undefined, game.id, game.id);
            if (result.success) {
                showToast(`Success! You have claimed your reward for ${game.title}. Our team will verify it soon.`, "success");
            } else {
                showToast(result.error || "Failed to claim reward.", "error");
            }
        } catch (e) {
            showToast("An error occurred during claiming.", "error");
        } finally {
            setIsClaiming(false);
        }
    };

    useEffect(() => {

        if (!game || !game.listed) return;
        
        const fetchBoard = async () => {
            try {
                const res:any = await getGiveawayLeaderboard(game.targetXP || 50, game.listed, game.id);
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



    if (!game) return null;

    const progress = Math.min(100, (totalFilled / (game.targetXP || 50)) * 100);


    return (
        <div style={{ 
            gridColumn: '1 / -1', 
            background: 'var(--background)', 
            border: '1px solid var(--outline-color)', 
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '3rem'
        }} className={styles.leaderboardContainer}>
            {/* Left: Game Info */}
            <div className={styles.leaderboardLeft} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 500px', overflow: 'hidden' }}>
                <div style={{ width: '100%', position: 'relative', aspectRatio: '21/9' }}>
                    <img 
                        src={`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.id}/header.jpg`} 
                        alt={game.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { (e.target as HTMLImageElement).src = game.image || ''; }}
                    />
                    <motion.div className={styles.discountBadge} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>GIVEAWAY</motion.div>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--background) 0%, transparent 80%)' }} />
                </div>

                <div style={{ padding: '0.5rem 3rem 3rem 3rem', display: 'flex', flexDirection: 'column', gap: '2rem', position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>

                    <div>
                        <span className="sectionLabel">Community Challenge</span>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', margin: '1rem 0 0.5rem' }}>{game.title}</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <CountdownTimer endTime={game.endTime} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                             <span style={{ fontSize: '0.7rem', opacity: 0.6, textTransform: 'uppercase', fontWeight: 800 }}>Retail Value:</span>
                             <span style={{ fontSize: '1.1rem', fontWeight: 900, textDecoration: 'line-through', color: '#ff4d4d' }}>{game.originalPrice || '$59.99'}</span>
                        </div>
                    </div>
                </div>

                <div>
                    <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
                        A collective mission! Once the progress bar hits 100%, we'll unlock the vault and distribute <strong>{game.quantity} Steam keys</strong> to the top contributors.
                    </p>
                </div>


                <div className={styles.progressContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        <span>Vault Progress</span>
                        <span>{totalFilled} / {game.targetXP || 50} XP</span>
                    </div>

                    <div style={{ height: '12px', background: 'var(--outline-color)', borderRadius: '50px', overflow: 'hidden' }}>
                        <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ height: '100%', background: 'var(--primary)', borderRadius: '50px' }}
                        />
                    </div>
                    <p style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.8rem', fontStyle: 'italic' }}>
                        * Keys are automatically dispatched to the Top Field Agents once the goal is met.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    {(() => {
                        const purchasedOffer = purchasedOffers[game.id];
                        const hasPurchased = purchasedOffer?.status === 'COMPLETED';


                        if (hasPurchased) {
                            if (purchasedOffer.steamKey) {
                                return (
                                    <div className={styles.keyContainer} style={{ width: '100%', flex: 1 }}>
                                        <div className={styles.hiddenKey}>{showKeys[game.id] ? (decryptedKeys[game.id] || 'Retrieving...') : '••••••••••'}</div>
                                        <button className={styles.btnUnlock} disabled={isFetchingKey[game.id]} onClick={() => handleShowKey(game.id)}>
                                            {isFetchingKey[game.id] ? 'WAIT...' : (showKeys[game.id] ? 'HIDE' : 'SHOW')}
                                        </button>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className={styles.keyContainer} style={{ width: '100%', flex: 1 }}>
                                        <div className={styles.hiddenKey} style={{ fontSize: '0.8rem' }}>PENDING VERIFICATION</div>
                                        <button className={styles.btnUnlock} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                            <Clock size={16} /> PENDING
                                        </button>
                                    </div>
                                );
                            }
                        }

                        if (progress >= 100) {
                            const isWinner = leaderboard[0]?.uid === user?.uid;
                            if (isWinner) {
                                return (
                                    <button 
                                        className={styles.btnUnlock} 
                                        style={{ width: '100%', flex: 1, padding: '1.2rem', justifyContent: 'center', gap: '0.8rem', background: 'var(--primary)', color: '#000', fontWeight: 900 }} 
                                        onClick={handleWinnerClaim}
                                        disabled={isClaiming}
                                    >
                                        {isClaiming ? <RefreshCw className="spin" size={16} /> : <ShoppingCart size={16} />}
                                        {isClaiming ? ' CLAIMING...' : ' CLAIM YOUR WINNER REWARD'}
                                    </button>
                                );
                            } else {

                                return (
                                    <button className="btnSolid" disabled style={{ flex: 1, padding: '1rem', opacity: 0.5, cursor: 'not-allowed' }}>
                                        <CheckCircle2 size={16} /> GOAL REACHED
                                    </button>
                                );
                            }
                        }

                        return (
                            <button onClick={() => handleInvestClick(game)} className="btnSolid" style={{ flex: 1, padding: '1rem' }}>
                                <TrendingUp size={16} /> Invest XP
                            </button>
                        );
                    })()}
                </div>
                </div>

            </div>

            {/* Right: Top Contributors */}
            <div style={{ 
                padding: '3rem', 
                position: 'relative', 
                overflow: 'hidden',
                background: 'linear-gradient(145deg, rgba(var(--primary-rgb), 0.03) 0%, transparent 100%)'
            }} className={styles.leaderboardRight}>
                <motion.div 
                    style={{ position: 'absolute', inset: -50, opacity: 0.5, backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(var(--primary-rgb), 0.1) 0%, transparent 50%)', pointerEvents: 'none' }} 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem', position: 'relative', zIndex: 2 }}>
                    <Users size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>Top Contributors</h3>
                </div>

                <p style={{ opacity: 0.8, fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '2rem', color: 'var(--text-muted)', position: 'relative', zIndex: 2 }}>
                    This isn't a standard giveaway—it's a community-wide vault! Everyone invests their XP together. When the vault hits 100%, the <strong>top investor</strong> takes home the Steam Key. All other participants will be <strong>fully refunded</strong>. Earn XP and invest fast to secure the top spot!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem', position: 'relative', zIndex: 2 }} className={styles.customScrollbar}>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Scanning recruitment logs...</div>
                    ) : leaderboard.length > 0 ? (
                        leaderboard.map((u, i) => {
                            const isMe = u.uid === user?.uid;
                            return (
                                <div key={i} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: '0.8rem 1.2rem',
                                    background: i === 0 ? 'rgba(var(--primary-rgb), 0.15)' : (isMe ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent'),
                                    border: i === 0 ? '1px solid var(--primary)' : (isMe ? '1px dashed var(--primary)' : '1px solid var(--outline-color)'),
                                    borderRadius: '8px',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 900, color: i === 0 ? 'var(--primary)' : 'inherit', fontSize: '1.1rem', minWidth: '24px' }}>#{i+1}</span>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <UserIcon size={16} />}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isMe ? 'var(--primary)' : 'inherit' }}>{u.displayName || 'Anonymous'}</span>
                                            {isMe && <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.6rem', fontWeight: 900, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>YOU</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{u.xp} <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>XP</span></div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--outline-color)', borderRadius: '12px' }}>
                            <p style={{ opacity: 0.5, fontSize: '0.8rem' }}>No activity detected yet. Be the first to invest!</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default function SteamMarketplace({ showAll = false }: { showAll?: boolean }) {
  const { user, affiliateId, xp, refreshStatus } = useAuth();
  const { setIsAuthModalOpen } = useModals();
  const { showToast } = useToast();
  const [isInvesting, setIsInvesting] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [investXPAmount, setInvestXPAmount] = useState(1);

  const [currentInvestedXP, setCurrentInvestedXP] = useState(0);

  const handleInvestClick = async (game: any) => {
    if (!user) {
        setIsAuthModalOpen(true);
        return;
    }
    if (xp <= 0) {
        showToast("You don't have any XP to invest!", "error");
        return;
    }
    setSelectedSteamGame(game);
    setInvestXPAmount(1);
    setIsInvestModalOpen(true);

    // Fetch initial progress
    try {
        if (game.offerScope === 'global') {
            const res = await getGiveawayLeaderboard(game.targetXP || 50, game.listed, game.id);
            if (res.success) setCurrentInvestedXP(res.totalFilled || 0);
        } else {
            const res = await getAffiliateProgress(user.uid, game.listed, game.id);
            if (res.success) setCurrentInvestedXP(res.count || 0);
        }
    } catch (e) {}
  };


  const handleInvest = async () => {
    if (!user || !selectedSteamGame) return;
    
    // Strict validation: Prevent negative XP
    if (investXPAmount <= 0) {
        showToast("Investment amount must be at least 1 XP.", "error");
        return;
    }
    if (xp < investXPAmount) {
        showToast("Insufficient XP! You cannot have a negative balance.", "error");
        return;
    }

    setIsInvesting(true);
    try {
        const res = await investXP(user.uid, selectedSteamGame.id, investXPAmount);
        if (res.success) {
            showToast(`Successfully invested ${investXPAmount} XP!`, "success");
            setIsInvestModalOpen(false);
            refreshStatus();
        } else {
            showToast(res.error || "Investment failed.", "error");
        }
    } catch (e) {
        showToast("An error occurred during investment.", "error");
    } finally {
        setIsInvesting(false);
    }
  };






  
  const [steamGames, setSteamGames] = useState<any[]>([]);
  const [selectedSteamGame, setSelectedSteamGame] = useState<any | null>(null);
  const [modalState, setModalState] = useState<'closed' | 'idle' | 'success'>('closed');
  const [purchasedOffers, setPurchasedOffers] = useState<{ [key: string]: any }>({});
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
  const [decryptedKeys, setDecryptedKeys] = useState<{ [key: string]: string }>({});
  const [isFetchingKey, setIsFetchingKey] = useState<{ [key: string]: boolean }>({});
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [offerPayLock, setOfferPayLock] = useState<'none' | 'paypal' | 'xp'>('none');


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
              targetXP: Number(data.targetXP || data.targetAffiliates || 10),
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
        {steamGames.filter(g => g.offerScope === 'global').map(game => (
            <GiveawayLeaderboard 
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
              handleInvestClick={handleInvestClick}
            />

        ))}

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
            // Filter out the global ones already shown as leaderboards
            const remainingGames = steamGames.filter(game => game.offerScope !== 'global');
            
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
                            handleInvestClick={handleInvestClick}
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
                        handleInvestClick={handleInvestClick}
                    />
                );
              });
          })()
        )}
      </motion.div>


      {!showAll && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Link href="/offers" className="btnSolid" style={{ padding: '1rem 3rem', fontSize: '0.9rem', letterSpacing: '2px' }}>
            SEE MORE OFFERS
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
                         {/* Money Section - Only show if not 100% free */}
                         {parseFloat(selectedSteamGame.discountPrice.replace(/[^0-9.]/g, '')) > 0 ? (
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
                         ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px', border: '1px dashed var(--primary)' }}>
                                 <TrendingUp size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                                 <h4 style={{ marginBottom: '0.5rem' }}>Invest XP</h4>
                                 <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '0.5rem' }}>This game is 100% free! Invest XP to unlock your key.</p>
                                 
                                 <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--outline-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                        <span>Your Balance:</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{xp} XP</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span>Goal:</span>
                                        <span>{selectedSteamGame.targetXP || 50} XP</span>
                                    </div>
                                 </div>

                                 <button 
                                    className="btnSolid" 
                                    onClick={() => { setModalState('closed'); handleInvestClick(selectedSteamGame); }} 
                                    disabled={xp <= 0}
                                    style={{ width: '100%', padding: '0.75rem' }}
                                 >
                                    OPEN INVESTMENT CONSOLE
                                 </button>

                                 <p style={{ fontSize: '0.65rem', opacity: 0.5, marginTop: '1rem' }}>
                                    Each XP invested brings you closer to claiming your Steam key.
                                 </p>

                             </div>
                         )}
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

      {/* Dedicated Investment Alert Modal */}
      <Modal isOpen={isInvestModalOpen} onClose={() => setIsInvestModalOpen(false)} maxWidth="420px">
        <div style={{ padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ 
                width: '50px', 
                height: '50px', 
                background: 'rgba(var(--primary-rgb), 0.1)', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem',
                border: '1px solid rgba(var(--primary-rgb), 0.2)'
            }}>
                <TrendingUp size={24} color="var(--primary)" />
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.25rem', color: 'var(--foreground)' }}>
                Investment <span style={{ color: 'var(--primary)' }}>Console</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--foreground)', opacity: 0.8, marginBottom: '1.5rem', maxWidth: '280px', margin: '0 auto 1.5rem' }}>
                Allocate XP for <strong>{selectedSteamGame?.title}</strong>.
            </p>

            {(() => {
                const target = selectedSteamGame?.targetXP || 50;
                const remaining = Math.max(0, target - currentInvestedXP);
                const maxAllowed = Math.min(xp, remaining);
                
                return (
                    <div style={{ 
                        background: 'rgba(var(--primary-rgb), 0.03)', 
                        padding: '1.5rem 1.25rem', 
                        borderRadius: '16px', 
                        marginBottom: '1.5rem',
                        border: '1px solid rgba(var(--primary-rgb), 0.15)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 900 }}>Amount</span>
                                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>
                                    {investXPAmount.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>XP</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--foreground)', opacity: 0.5, fontWeight: 900 }}>Max Cap</span>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--foreground)' }}>
                                    {remaining.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input 
                                type="range" 
                                min="1" 
                                max={maxAllowed > 0 ? maxAllowed : 1} 
                                value={investXPAmount} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setInvestXPAmount(Math.min(maxAllowed, Math.max(1, val)));
                                }}
                                disabled={maxAllowed <= 0}
                                style={{ 
                                    flex: 1,
                                    accentColor: 'var(--primary)',
                                    height: '6px',
                                    borderRadius: '10px',
                                    cursor: maxAllowed > 0 ? 'pointer' : 'not-allowed'
                                }}
                            />
                            <button 
                                onClick={() => setInvestXPAmount(maxAllowed)}
                                disabled={maxAllowed <= 0}
                                style={{
                                    background: 'rgba(var(--primary-rgb), 0.1)',
                                    border: '1px solid rgba(var(--primary-rgb), 0.2)',
                                    color: 'var(--primary)',
                                    padding: '0.3rem 0.6rem',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    cursor: 'pointer'
                                }}
                            >
                                MAX
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--foreground)', opacity: 0.5 }}>
                            <span>Personal: {xp.toLocaleString()} XP</span>
                            <span>Remaining Goal: {remaining.toLocaleString()} XP</span>
                        </div>
                    </div>
                );
            })()}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                    className="btnOutline" 
                    onClick={() => setIsInvestModalOpen(false)}
                    style={{ flex: 1, padding: '0.9rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem' }}
                >
                    CANCEL
                </button>
                <button 
                    className="btnSolid" 
                    onClick={handleInvest}
                    disabled={isInvesting || xp <= 0 || investXPAmount > xp}
                    style={{ 
                        flex: 2, 
                        padding: '0.9rem', 
                        borderRadius: '10px',
                        background: 'var(--primary)', 
                        color: '#000', 
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        opacity: (isInvesting || xp <= 0 || investXPAmount > xp) ? 0.5 : 1 
                    }}
                >
                    {isInvesting ? 'WAIT...' : `CONFIRM`}
                </button>
            </div>
        </div>
      </Modal>



    </motion.section>

  );
}
