"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    User, Mail, Calendar, Key, Shield, LogOut, ArrowLeft, Users, 
    Percent, ShoppingBag, MapPin, CheckCircle, Activity, TrendingUp,
    Lightbulb, Trash2, ExternalLink, AlertCircle, Bookmark 
} from 'lucide-react';
import LiveCursors from '@/components/LiveCursors';
import pageStyles from '@/app/page.module.css';
import acct from './account.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { getOwnedGames, getUserActivity } from '@/lib/admin-actions';
import { getUserIdeas, deleteIdea, getSavedIdeas } from '@/lib/idea-actions';
import { getUserAffiliates } from '@/lib/admin-actions';

import { useModals } from '@/lib/contexts/ModalContext';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import Modal from '@/components/Modal';
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false });

interface ActivityItem {
    id: string;
    type: 'purchase' | 'account' | 'reward';
    title: string;
    extra: string;
    date: string;
}

export default function AccountPage() {
    const { user, isAuthLoading, logout, affiliateId, affiliateCount, xp, affiliateLevel, affiliateLevelDetails, isAdmin, login } = useAuth();

    const router = useRouter();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [userIdeas, setUserIdeas] = useState<any[]>([]);
    const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'activity' | 'library' | 'rewards' | 'ideas' | 'affiliates'>('activity');
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(false);
    const [isLoadingActivities, setIsLoadingActivities] = useState(true);
    const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [ideaToDelete, setIdeaToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    const { 
        isAuthModalOpen, setIsAuthModalOpen, 
        isAdminModalOpen, setIsAdminModalOpen,
        isCouponModalOpen, setIsCouponModalOpen,
        isAddOfferModalOpen, setIsAddOfferModalOpen,
        isListGameOpen, setIsListGameOpen,
        isDispatchModalOpen, setIsDispatchModalOpen
    } = useModals();

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login?returnUrl=/account');
        }
    }, [user, isAuthLoading, router]);

    useEffect(() => {
        if (user) {
            const fetchActivities = async (pageNum: number = 1) => {
                if (pageNum === 1) setIsLoadingActivities(true);
                else setIsLoadingMore(true);
                
                try {
                    const mapped: ActivityItem[] = [];

                    // 1. Fetch unified activity with pagination
                    const actRes = await getUserActivity(user.uid, pageNum, 10);
                    if (actRes.success && actRes.activity) {
                        actRes.activity.forEach((act: any) => {
                            mapped.push({
                                id: act.id,
                                type: act.type === 'spent' ? 'purchase' : 'reward',
                                title: act.title,
                                extra: act.details,
                                date: act.date
                            });
                        });
                        setHasMore(actRes.hasMore || false);
                    }
                    
                    if (pageNum === 1) {
                        // 2. Fetch owned games (only on first page for now, or unified if possible)
                        const res = await getOwnedGames(user.uid);
                        if (res.success && res.details) {
                            Object.entries(res.details).forEach(([title, detail]: any) => {
                                // Avoid duplicates if already in activity
                                if (!mapped.find(m => m.title.includes(title))) {
                                    mapped.push({
                                        id: detail.activationKey || title,
                                        type: 'purchase',
                                        title: `Game Purchase: ${title}`,
                                        extra: `Status: Verified. Key assigned.`,
                                        date: detail.purchaseDate
                                    });
                                }
                            });
                        }

                        // 3. Genesis event
                        mapped.push({
                            id: 'genesis',
                            type: 'account',
                            title: 'Joined Crack Origins',
                            extra: 'Account successfully registered and verified on the platform.',
                            date: user.metadata.creationTime || new Date().toISOString()
                        });
                    }

                    if (pageNum === 1) {
                        mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        setActivities(mapped);
                    } else {
                        setActivities(prev => {
                            const newArr = [...prev, ...mapped];
                            // Sorting everything might be expensive but ensures correct timeline
                            return newArr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        });
                    }
                } catch (err) {
                    console.error("Failed to load activities", err);
                } finally {
                    setIsLoadingActivities(false);
                    setIsLoadingMore(false);
                }
            };
            
            const fetchIdeas = async () => {
                setIsLoadingIdeas(true);
                try {
                    const res = await getUserIdeas(user.uid);
                    if (res.success) {
                        setUserIdeas(res.ideas);
                    }
                } catch (err) {
                    console.error("Failed to load ideas", err);
                } finally {
                    setIsLoadingIdeas(false);
                }
            };

            const fetchSaved = async () => {
                setIsLoadingSaved(true);
                try {
                    const res = await getSavedIdeas(user.uid);
                    if (res.success) {
                        setSavedIdeas(res.ideas || []);
                    }
                } catch (err) {
                    console.error("Failed to load saved ideas", err);
                } finally {
                    setIsLoadingSaved(false);
                }
            };

            const fetchAffiliates = async () => {
                setIsLoadingAffiliates(true);
                try {
                    const res = await getUserAffiliates(user.uid);
                    if (res.success) {
                        setAffiliates(res.affiliates || []);
                    }
                } catch (err) {
                    console.error("Failed to load affiliates", err);
                } finally {
                    setIsLoadingAffiliates(false);
                }
            };

            if (page === 1) {
                fetchActivities(1);
                fetchIdeas();
                fetchSaved();
                fetchAffiliates();
            } else {
                fetchActivities(page);
            }
        }
    }, [user, affiliateCount, xp, page]);

    const handleDeleteIdea = async (ideaId: string) => {
        if (!user) return;
        setIsDeleting(true);
        try {
            const res = await deleteIdea(ideaId, user.uid);
            if (res.success) {
                setUserIdeas(prev => prev.filter(idea => idea._id !== ideaId));
                setIdeaToDelete(null);
            } else {
                alert(res.error || "Failed to delete idea.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("An error occurred while deleting the idea.");
        } finally {
            setIsDeleting(false);
        }
    };


    if (isAuthLoading || !user) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
    );

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    const formatDate = (dateString: string) => {
        const d = new Date(dateString);
        return d.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
        const res = await login(type, credentials);
        if (res?.success !== false) {
            setIsAuthModalOpen(false);
        }
        return res;
    };

    return (
        <>
            <LiveCursors />
            <div className={pageStyles.backgroundAnimation}></div>

            <Header 
                isMobileMenuOpen={isMobileMenuOpen} 
                setIsMobileMenuOpen={setIsMobileMenuOpen} 
            />

            <MobileNav 
                isOpen={isMobileMenuOpen} 
                setIsOpen={setIsMobileMenuOpen} 
            />

            <AuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onLogin={handleLogin} 
            />
            <CouponModal 
                isOpen={isCouponModalOpen} 
                onClose={() => setIsCouponModalOpen(false)} 
            />
            <AddOfferModal 
                isOpen={isAddOfferModalOpen} 
                onClose={() => setIsAddOfferModalOpen(false)} 
            />
            <ListGameModal 
                isOpen={isListGameOpen} 
                onClose={() => setIsListGameOpen(false)} 
            />
            <DispatchModal
                isOpen={isDispatchModalOpen}
                onClose={() => setIsDispatchModalOpen(false)}
            />
            {user && isAdmin && (
                <AdminPanel
                    userUid={user.uid}
                    isOpen={isAdminModalOpen}
                    setIsOpen={setIsAdminModalOpen}
                />
            )}

            <main className={acct.accountMain}>

                <div className={acct.wrapper}>
                    
                    <button 
                        onClick={() => { if(window.history.length > 2) router.back(); else router.push('/'); }} 
                        className={acct.backBtn}
                    >
                        <ArrowLeft size={18} /> Back
                    </button>

                    <div className={acct.pageHeader}>
                        <div>
                            <span className="sectionLabel">Agent Profile</span>
                            <h1 className={acct.pageTitle}>User <span style={{ color: 'var(--primary)' }}>Workspace</span></h1>
                        </div>
                        <button onClick={handleLogout} className={acct.logoutBtn}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>

                    <div className={acct.profileGrid}>
                        
                        {/* LEFT COLUMN: Profile Details */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className={acct.profileCard}
                        >
                            <div className={acct.profileHeader}>
                                <div style={{ position: 'relative' }}>
                                    {user.photoURL ? (
                                        <Image src={user.photoURL} alt="Profile Avatar" width={80} height={80} className={acct.profileAvatar} unoptimized />
                                    ) : (
                                        <div className={acct.profileAvatarFallback}>
                                            <User size={30} />
                                        </div>
                                    )}
                                </div>
                                <div className={acct.profileMeta}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <h2 className={acct.profileName}>{user.displayName || 'Gamers'}</h2>
                                        {isAdmin && <Shield size={16} color="var(--primary)" />}
                                    </div>
                                    <span className={acct.profileRole}>{isAdmin ? 'Administrator' : 'Standard Member'} · Crack Origins</span>
                                </div>
                            </div>

                            <div className={acct.profileStats}>
                                <div className={acct.statItem}>
                                    <span className={acct.statLabel}>Registered</span>
                                    <span className={acct.statValue}>{new Date(user.metadata.creationTime || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className={acct.statItem}>
                                    <span className={acct.statLabel}>Last Active</span>
                                    <span className={acct.statValue}>{new Date(user.metadata.lastSignInTime || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <div className={acct.metricCard} style={{ gridColumn: 'span 2', background: 'rgba(var(--primary-rgb), 0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div className={acct.metricHeader}>
                                            <TrendingUp className={acct.metricIcon} />
                                            <span className={acct.metricTitle}>Rank: {affiliateLevel?.toUpperCase() || 'STARTER'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)' }}>
                                            {affiliateLevelDetails?.payment_commision}% Comm. | {affiliateLevelDetails?.onetime_reward_xp} XP / Recruit
                                        </div>
                                    </div>
                                    
                                    <div className={acct.metricValue} style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{xp} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>XP</span></div>
                                    
                                    {affiliateLevelDetails?.nextLevelGoal && (
                                        <div style={{ width: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', marginBottom: '0.3rem', fontWeight: 700, opacity: 0.8 }}>
                                                <span>Next Milestone</span>
                                                <span>{xp} / {affiliateLevelDetails.nextLevelGoal} XP</span>
                                            </div>
                                            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (xp / affiliateLevelDetails.nextLevelGoal) * 100)}%` }}
                                                    style={{ height: '100%', background: 'var(--primary)', borderRadius: '10px' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={acct.metricCard}>
                                    <div className={acct.metricHeader}>
                                        <User className={acct.metricIcon} />
                                        <span className={acct.metricTitle}>Field Operations</span>
                                    </div>
                                    <div className={acct.metricValue}>{affiliateCount}</div>
                                    <div className={acct.metricTrend}>
                                        <span className={acct.trendValue}>Total Recruits</span>
                                    </div>
                                </div>
                            </div>

                            <div className={acct.profileDetails}>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><Mail size={16} /> Email</span>
                                    <span className={acct.detailValue}>{user.email}</span>
                                </div>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><Key size={16} /> Affiliate ID</span>
                                    <span className={acct.detailValue} style={{ color: 'var(--primary)' }}>{affiliateId || 'N/A'}</span>
                                </div>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><Users size={16} /> Recruits</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span className={acct.detailValue}>{affiliateCount || 0} Members</span>
                                        <button onClick={() => setActiveTab('affiliates')} className="btnOutline" style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', borderColor: 'rgba(var(--primary-rgb), 0.3)', color: 'var(--primary)' }}>MY REWARD HISTORY</button>
                                    </div>
                                </div>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><Activity size={16} /> Affiliate Level</span>
                                    <span className={acct.detailValue} style={{ textTransform: 'uppercase', fontWeight: 800 }}>{affiliateLevel || 'starter'}</span>
                                </div>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><Percent size={16} /> XP Balance</span>
                                    <span className={acct.detailValue} style={{ color: 'var(--primary)', fontWeight: 800 }}>{xp || 0} XP</span>
                                </div>
                                <div className={acct.detailRow}>
                                    <span className={acct.detailLabel}><MapPin size={16} /> Region</span>
                                    <span className={acct.detailValue}>Global (Auto)</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* RIGHT COLUMN: Activity Panel */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className={acct.activityCard}
                        >
                            <div className={acct.activityTabs}>
                                <div onClick={() => setActiveTab('activity')} className={`${acct.activityTab} ${activeTab === 'activity' ? acct.active : ''}`}>Activity</div>
                                <div onClick={() => setActiveTab('library')} className={`${acct.activityTab} ${activeTab === 'library' ? acct.active : ''}`}>Library</div>
                                <div onClick={() => setActiveTab('affiliates')} className={`${acct.activityTab} ${activeTab === 'affiliates' ? acct.active : ''}`}>Recruits</div>
                                <div onClick={() => setActiveTab('rewards')} className={`${acct.activityTab} ${activeTab === 'rewards' ? acct.active : ''}`} style={activeTab !== 'rewards' ? { opacity: 0.5 } : {}}>Rewards</div>
                                <div onClick={() => setActiveTab('ideas')} className={`${acct.activityTab} ${activeTab === 'ideas' ? acct.active : ''}`}>Ideas</div>
                            </div>

                            <div className={acct.activityContent}>
                                {activeTab === 'activity' && (
                                    <>
                                        {isLoadingActivities ? (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading activity logs...</div>
                                        ) : activities.length > 0 ? (
                                            <>
                                                {activities.map(activity => (
                                                    <div key={activity.id} className={acct.timelineItem}>
                                                        <div className={acct.timelineIcon}>
                                                            {activity.type === 'purchase' ? <ShoppingBag size={18} /> : 
                                                            activity.type === 'reward' ? <CheckCircle size={18} /> : 
                                                            <Activity size={18} />}
                                                        </div>
                                                        <div className={acct.timelineDetails}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                                <h4 className={acct.timelineTitle}>{activity.title}</h4>
                                                                <span className={acct.timelineMeta}>{formatDate(activity.date)}</span>
                                                            </div>
                                                            <p className={acct.timelineExtra}>{activity.extra}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {hasMore && (
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
                                                        <button 
                                                            onClick={() => setPage(p => p + 1)} 
                                                            className={acct.viewIdeaBtn}
                                                            style={{ padding: '0.6rem 2rem', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)' }}
                                                            disabled={isLoadingMore}
                                                        >
                                                            {isLoadingMore ? 'Loading...' : 'Load More Records'}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)' }}>No recent activity to display.</div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'ideas' && (
                                    <div className={acct.ideasGrid}>
                                        {isLoadingIdeas ? (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Scanning idea databases...</div>
                                        ) : userIdeas.length > 0 ? (
                                            userIdeas.map(idea => (
                                                <div key={idea._id} className={acct.ideaCard}>
                                                    <div className={acct.ideaCardThumbnail}>
                                                        <Image src={idea.image} alt={idea.title} fill style={{ objectFit: 'cover' }} unoptimized />
                                                        <div className={acct.ideaCardBadge}>
                                                            <Lightbulb size={12} /> Live
                                                        </div>
                                                    </div>
                                                    <div className={acct.ideaCardBody}>
                                                        <h4 className={acct.ideaCardTitle}>{idea.title}</h4>
                                                        <p className={acct.ideaCardDesc}>{idea.description.substring(0, 80)}...</p>
                                                        <div className={acct.ideaCardFooter}>
                                                            <Link href={`/ideas/${idea._id}/${idea.slug}`} className={acct.viewIdeaBtn}>
                                                                <ExternalLink size={14} /> View
                                                            </Link>
                                                            <button 
                                                                onClick={() => setIdeaToDelete(idea)} 
                                                                className={acct.deleteIdeaBtn}
                                                                title="Terminate Idea"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: 'span 2', padding: '3rem' }}>
                                                <Lightbulb size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>No ideas published yet. Start your first collaboration project!</p>
                                                <Link href="/ideas" className={acct.createIdeaLink}>Explore Ideas</Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'library' && (
                                    <div className={acct.ideasGrid}>
                                        {isLoadingSaved ? (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Retrieving your vault...</div>
                                        ) : savedIdeas.length > 0 ? (
                                            savedIdeas.map(idea => (
                                                <div key={idea._id} className={acct.ideaCard}>
                                                    <div className={acct.ideaCardThumbnail}>
                                                        <Image src={idea.image} alt={idea.title} fill style={{ objectFit: 'cover' }} unoptimized />
                                                        <div className={acct.ideaCardBadge} style={{ background: 'var(--primary)', color: 'black' }}>
                                                            <Bookmark size={12} fill="black" /> Saved
                                                        </div>
                                                    </div>
                                                    <div className={acct.ideaCardBody}>
                                                        <h4 className={acct.ideaCardTitle}>{idea.title}</h4>
                                                        <p className={acct.ideaCardDesc}>{idea.description.substring(0, 80)}...</p>
                                                        <div className={acct.ideaCardFooter}>
                                                            <Link href={`/ideas/${idea._id}/${idea.slug}`} className={acct.viewIdeaBtn}>
                                                                <ExternalLink size={14} /> Read More
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: 'span 2', padding: '3rem' }}>
                                                <Bookmark size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>Your vault is empty. Start saving chronicles to build your library!</p>
                                                <Link href="/ideas" className={acct.createIdeaLink}>Discover Chronicles</Link>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'rewards' && (
                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                                        <Activity size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                        <p>This module is currently under maintenance. Estimated completion: Q3 2026.</p>
                                    </div>
                                )}

                                {activeTab === 'affiliates' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {isLoadingAffiliates ? (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Scanning recruitment logs...</div>
                                        ) : affiliates.length > 0 ? (
                                            <>
                                                <div style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--outline-color)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Agent Unit</span>
                                                    <span>Reward Captured</span>
                                                </div>
                                                {affiliates.map((aff, i) => (
                                                    <div key={i} className={acct.timelineItem} style={{ border: '1px solid var(--outline-color)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                                                        <div className={acct.timelineIcon} style={{ background: 'var(--outline-color)' }}>
                                                            {aff.logo ? (
                                                                <Image src={aff.logo} alt={aff.name} width={36} height={36} style={{ borderRadius: '6px', objectFit: 'cover' }} unoptimized />
                                                            ) : (
                                                                <User size={18} />
                                                            )}
                                                        </div>
                                                        <div className={acct.timelineDetails}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <h4 className={acct.timelineTitle} style={{ fontSize: '0.95rem' }}>{aff.name}</h4>
                                                                    <span className={acct.timelineMeta}>Joined: {formatDate(aff.joinedAt)}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ color: 'var(--primary)', fontWeight: 950, fontSize: '1.1rem' }}>+{aff.rewardXP} XP</div>
                                                                    <div style={{ fontSize: '0.6rem', opacity: 0.5, fontWeight: 700 }}>RECRUITMENT REWARD</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                                                <Users size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                                <p>No recruits found. Share your Affiliate ID to start building your squad!</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </main>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!ideaToDelete}
                onClose={() => setIdeaToDelete(null)}
                title="Protocol: Project Termination"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ 
                        width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(255, 50, 50, 0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b',
                        border: '1px solid rgba(255, 50, 50, 0.2)'
                    }}>
                        <AlertCircle size={32} />
                    </div>

                    <div>
                        <h3 style={{ margin: '0 0 0.5rem', color: 'var(--foreground)', fontSize: '1.25rem', fontWeight: 800 }}>Confirm Erasure?</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            You are about to permanently delete <span style={{ color: 'var(--primary)', fontWeight: 800 }}>"{ideaToDelete?.title}"</span>. 
                            All associated documents, collaborations, and community logs will be wiped from the mainframe.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                        <button 
                            onClick={() => setIdeaToDelete(null)} 
                            style={{ 
                                flex: 1, padding: '0.8rem', borderRadius: '8px', 
                                background: 'transparent', border: '1px solid var(--outline-color)', 
                                color: 'var(--foreground)', fontWeight: 700, cursor: 'pointer' 
                            }}
                            disabled={isDeleting}
                        >
                            Abort
                        </button>
                        <button 
                            onClick={() => handleDeleteIdea(ideaToDelete?._id)} 
                            style={{ 
                                flex: 1.5, padding: '0.8rem', borderRadius: '8px', 
                                background: '#ff6b6b', border: 'none', 
                                color: 'white', fontWeight: 800, cursor: 'pointer' 
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'ERASING...' : 'CONFIRM TERMINATION'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
