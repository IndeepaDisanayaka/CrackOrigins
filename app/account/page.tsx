'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Key, Shield, LogOut, ArrowLeft, Users, Percent, ShoppingBag } from 'lucide-react';
import LiveCursors from '@/components/LiveCursors';
import pageStyles from '@/app/page.module.css';
import acct from './account.module.css';
import Image from 'next/image';
import Link from 'next/link';

export default function AccountPage() {
    const { user, isAuthLoading, logout, affiliateId, affiliateCount, discount, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login?returnUrl=/account');
        }
    }, [user, isAuthLoading, router]);

    if (isAuthLoading || !user) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>
    );

    const handleLogout = async () => {
        await logout();
        router.push('/');
    };

    return (
        <>
            <LiveCursors />
            <div className={pageStyles.backgroundAnimation}></div>

            <main className={acct.accountMain}>
                {/* Back Button */}
                <button 
                    onClick={() => { if(window.history.length > 2) router.back(); else router.push('/'); }} 
                    className={acct.backBtn}
                >
                    <ArrowLeft size={18} /> Back
                </button>

                <div className={acct.wrapper}>
                    
                    {/* Header Section */}
                    <div className={acct.pageHeader}>
                        <div>
                            <span className="sectionLabel">Dashboard</span>
                            <h1 className={acct.pageTitle}>Your <span style={{ color: 'var(--primary)' }}>Account</span></h1>
                        </div>
                        <button onClick={handleLogout} className={acct.logoutBtn}>
                            <LogOut size={16} /> Logout
                        </button>
                    </div>

                    {/* Profile Layout */}
                    <div className={acct.profileGrid}>
                        
                        {/* Avatar & Main Info */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className={acct.profileCard}
                        >
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                {user.photoURL ? (
                                    <Image src={user.photoURL} alt="Profile Avatar" width={100} height={100} style={{ borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }} unoptimized />
                                ) : (
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(var(--primary-rgb), 0.1)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                        <User size={40} />
                                    </div>
                                )}
                                {isAdmin && (
                                    <div style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--primary)', color: '#000', padding: '0.4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(var(--primary-rgb), 0.5)' }} title="Administrator">
                                        <Shield size={16} />
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>{user.displayName || 'Gamer'}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                                    <Mail size={14} /> {user.email}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                    <Calendar size={14} /> Joined {new Date(user.metadata.creationTime || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        </motion.div>

                        {/* Stats & Actions */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className={acct.statsColumn}
                        >
                            {/* Affiliate Stats Banner */}
                            <div className={acct.affiliateBanner}>
                                <div style={{ position: 'absolute', top: '-10%', right: '-5%', opacity: 0.1, color: 'var(--primary)', transform: 'rotate(15deg)' }}>
                                    <Users size={150} />
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 1.5rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Key size={18} color="var(--primary)" /> Affiliate Profile
                                </h3>
                                
                                <div className={acct.affiliateStatsGrid}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Affiliate ID</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{affiliateId || '---'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recruits</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)' }}>{affiliateCount || 0}</span>
                                            <Users size={20} color="var(--primary)" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Discount Pool</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--foreground)' }}>{discount || 0}%</span>
                                            <Percent size={20} color="var(--primary)" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className={acct.optionsGrid}>
                                <Link href="/offers" style={{ textDecoration: 'none' }}>
                                    <div className={acct.optionCard}>
                                        <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                            <ShoppingBag size={20} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0 0 0.25rem', color: 'var(--foreground)', fontWeight: 800 }}>Explore Offers</h4>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Find premium steam keys and check your purchased stock.</p>
                                        </div>
                                    </div>
                                </Link>

                                <div className={acct.optionCardDisabled}>
                                    <div style={{ background: 'var(--outline-color)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <Key size={20} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem', color: 'var(--foreground)', fontWeight: 800 }}>Library (Soon)</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>Your entire collection of keys will be tracked here shortly.</p>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                </div>
            </main>
        </>
    );
}
