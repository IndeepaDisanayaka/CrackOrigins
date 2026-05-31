"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, AlertTriangle, ShieldAlert, Trash2, 
    Calendar, Mail, Fingerprint, Globe, Lightbulb, 
    Users, TrendingUp, CheckCircle 
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import LiveCursors from '@/components/LiveCursors';
import pageStyles from '@/app/page.module.css';
import styles from './delete.module.css';
import { getUserIdeas } from '@/lib/idea-actions';
import { requestDeletionVerification, submitDeletionRequest } from '@/lib/admin-actions';
import { useToast } from '@/components/Toast';

export default function DeleteAccountPage() {
    const { user, isAuthLoading, affiliateCount, xp, country, logout } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [publishedIdeasCount, setPublishedIdeasCount] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [confirmation, setConfirmation] = useState(false);
    const [isCodeSent, setIsCodeSent] = useState(false);
    
    // Form States
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loginMethod, setLoginMethod] = useState('');
    const [verifyEmail, setVerifyEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login?returnUrl=/account/delete');
        }
    }, [user, isAuthLoading, router]);

    useEffect(() => {
        if (user) {
            const fetchIdeasCount = async () => {
                try {
                    const res = await getUserIdeas(user.uid);
                    if (res.success) {
                        setPublishedIdeasCount(res.ideas?.length || 0);
                    }
                } catch (err) {
                    console.error("Failed to load ideas count", err);
                }
            };
            fetchIdeasCount();
        }
    }, [user]);

    const handleSendCode = async () => {
        if (!user || verifyEmail !== user.email) {
            showToast("Please enter your current email address correctly.", 'error');
            return;
        }

        setIsSendingCode(true);
        try {
            const res = await requestDeletionVerification(user.uid, user.email, user.displayName || 'Agent');
            if (res.success) {
                setIsCodeSent(true);
                showToast("Verification code sent to your email.", 'success');
            } else {
                showToast(res.error || "Failed to send code.", 'error');
            }
        } catch (error) {
            showToast("An error occurred.", 'error');
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleRequestDeletion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmation || verifyEmail !== user?.email) {
            showToast("Please confirm the deletion and verify your email correctly.", 'error');
            return;
        }

        if (!verificationCode) {
            showToast("Please enter the verification code sent to your email.", 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitDeletionRequest({
                uid: user.uid,
                email: user.email,
                name: user.displayName || 'Agent',
                code: verificationCode,
                reason,
                description,
                loginMethod,
                stats: { affiliateCount, xp, publishedIdeasCount, country }
            });

            if (res.success) {
                showToast("Account deletion request submitted.", 'success');
                alert("Your account deletion request has been received. Your account will be permanently removed in 30 days. You will now be logged out.");
                await logout();
                router.push('/');
            } else {
                showToast(res.error || "Failed to submit request.", 'error');
            }
        } catch (error) {
            console.error("Request failed", error);
            showToast("An error occurred. Please try again later.", 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isAuthLoading || !user) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    }

    const creationDate = user.metadata.creationTime 
        ? new Date(user.metadata.creationTime)
        : new Date();

    const creationMonth = creationDate.toLocaleString('default', { month: 'long' });
    const creationYear = creationDate.getFullYear();

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

            <main className={styles.deleteMain}>
                <div className={styles.wrapper}>
                    
                    <button 
                        onClick={() => router.back()} 
                        className={styles.backBtn}
                    >
                        <ArrowLeft size={18} /> Back to Workspace
                    </button>

                    <div className={styles.header}>
                        <span className="sectionLabel" style={{ color: '#ff6b6b' }}>Safety Protocol</span>
                        <h1 className={styles.title}>Account <span style={{ color: '#ff6b6b' }}>Termination</span></h1>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.warningBanner}
                    >
                        <AlertTriangle className={styles.warningIcon} size={24} />
                        <div className={styles.warningContent}>
                            <h3>Irreversible Action Detected</h3>
                            <p>
                                Requesting account deletion will initiate a 30-day countdown. 
                                After this period, <span style={{ fontWeight: 800 }}>all data, XP, and affiliate records</span> will be permanently purged from our mainframe. 
                                No evidence of your existence on this platform will remain.
                            </p>
                        </div>
                    </motion.div>

                    <form onSubmit={handleRequestDeletion} className={styles.formCard}>
                        
                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>Account Identity</h2>
                            
                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}><Calendar size={12} /> Registered</span>
                                    <span className={styles.statValue}>{creationMonth} {creationYear}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}><Globe size={12} /> Logged From</span>
                                    <span className={styles.statValue}>{country}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}><TrendingUp size={12} /> XP Balance</span>
                                    <span className={styles.statValue}>{xp} XP</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}><Users size={12} /> Affiliates</span>
                                    <span className={styles.statValue}>{affiliateCount} Units</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}><Lightbulb size={12} /> Ideas Live</span>
                                    <span className={styles.statValue}>{publishedIdeasCount} Projects</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>Verification Details</h2>
                            
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Confirm Email Address</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input 
                                        type="email" 
                                        className={styles.inputField} 
                                        style={{ flex: 1 }}
                                        placeholder={user.email || 'Enter your email'}
                                        value={verifyEmail}
                                        onChange={(e) => setVerifyEmail(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={handleSendCode}
                                        className={styles.submitBtn}
                                        style={{ margin: 0, padding: '0 1.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                        disabled={isSendingCode || verifyEmail !== user.email}
                                    >
                                        {isSendingCode ? 'Sending...' : 'Send Code'}
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>* Type your email exactly to receive the verification code.</span>
                            </div>

                            {isCodeSent && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={styles.inputGroup}
                                >
                                    <label className={styles.inputLabel}>Verification Code</label>
                                    <input 
                                        type="text" 
                                        className={styles.inputField} 
                                        placeholder="Enter 6-digit code"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        maxLength={6}
                                        required
                                    />
                                </motion.div>
                            )}

                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Primary Login Method</label>
                                <select 
                                    className={`${styles.inputField} ${styles.selectField}`}
                                    value={loginMethod}
                                    onChange={(e) => setLoginMethod(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select Method</option>
                                    <option value="email-pass">Email & Password</option>
                                    <option value="google">Google Authentication</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>Exit Survey</h2>
                            
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Reason for Termination</label>
                                <input 
                                    type="text" 
                                    className={styles.inputField} 
                                    placeholder="e.g., Security concerns, inactivity, etc."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Simple Description</label>
                                <textarea 
                                    className={styles.inputField} 
                                    rows={3}
                                    placeholder="Please provide a brief explanation..."
                                    style={{ resize: 'none' }}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <h2 className={styles.sectionTitle}>Final Agreement</h2>
                            
                            <div className={styles.checkboxGroup} onClick={() => setConfirmation(!confirmation)}>
                                <div className={`${styles.checkbox} ${confirmation ? styles.checked : ''}`}>
                                    {confirmation && <CheckCircle size={14} />}
                                </div>
                                <span className={styles.checkboxLabel}>
                                    I confirm that I wish to delete my account and all associated data. I understand that I will not be able to start a new account with this email address once the 30-day deletion process is complete.
                                </span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className={styles.submitBtn}
                            disabled={isSubmitting || !confirmation || verifyEmail !== user.email || !verificationCode}
                        >
                            {isSubmitting ? 'Processing Request...' : 'Initiate Permanent Deletion'}
                        </button>

                        <div className={styles.footerNote}>
                            <ShieldAlert size={16} style={{ marginBottom: '0.5rem', color: '#ff6b6b' }} />
                            <p>
                                Warning: All XP, Affiliates, and published Ideas will be erased. 
                                You will NOT be able to create a new account with this email ({user.email}) in the future.
                            </p>
                        </div>
                    </form>
                </div>
            </main>


            <Footer />
        </>
    );
}
