'use client';
import styles from './page.module.css';
import {
    Gamepad2, Users, MessageSquare, Paintbrush, Send,
    Skull, Swords, Ghost, Trophy, Target, Zap, User,
    Ticket, Plus, Calendar, Percent, Hash, Copy, Tag
} from 'lucide-react';
import GamesCarousel from '../components/GamesCarousel';
import ExtraSections from '../components/ExtraSections';
import AffiliateSection from '../components/AffiliateSection';
import ThemeToggle from '../components/ThemeToggle';
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Counter from '../components/Counter';
import FlipWords from '../components/FlipWords';
import KoFi from '@/lib/co-fi';
import Modal from '../components/Modal';
import { syncUserRecord, checkAdminStatus, createCoupon } from '@/lib/paypal-server';
import { useToast } from '../components/Toast';

const provider = new GoogleAuthProvider();

export const login = () => signInWithPopup(auth, provider)
    .then(async (result) => {
        const user = result.user;

        // Server-side database write (Secure from client network tab)
        await syncUserRecord(user.uid, {
            isOwner: false,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            created: user.metadata.creationTime,
            last: user.metadata.lastSignInTime
        });

    }).catch((error) => {
        console.error("Login Error:", error);
    });

export default function Home() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const { showToast } = useToast();

    // Form states
    const [couponForm, setCouponForm] = useState({
        name: "",
        discount: "",
        expire: "",
        quantity: 100
    });

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            setIsAuthLoading(false);
            if (u) {
                const res = await checkAdminStatus(u.uid);
                setIsAdmin(res.isOwner);
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsub();
    }, []);

    const handleGenerateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!couponForm.name || !couponForm.discount || !couponForm.expire) {
            showToast("Please fill all fields.", "error");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await createCoupon(user.uid, couponForm);
            if (result.success && result.couponCode) {
                setGeneratedCode(result.couponCode);
                showToast("Coupon generated successfully!", "success");
            } else {
                showToast(result.error || "Failed to create coupon.", "error");
            }
        } catch (err) {
            showToast("Error creating coupon.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <div className={styles.splashScreen}>
                <div className={styles.splashText}>
                    Crack <span>Origins</span>
                </div>
            </div>

            <div className={styles.backgroundAnimation}></div>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div className={styles.navLinks}>
                        <a href="#about" className={styles.link}>About</a>
                        <a href="#project" className={styles.link}>Games</a>
                        <a href="#projects" className={styles.link}>Projects</a>
                        <a href="#teams" className={styles.link}>Community</a>
                    </div>

                    <div className={styles.logo}>
                        <div className={styles.logoIcon}>
                            <Gamepad2 size={16} color="#000" />
                        </div>
                        <span>Crack Origins</span>
                    </div>

                    <div className={styles.headerActions}>
                        <ThemeToggle />
                        {isAuthLoading ? (
                            <div className={styles.authLoading}></div>
                        ) : user ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {isAdmin && (
                                    <button
                                        className="btnOutline"
                                        onClick={() => { setIsAdminModalOpen(true); setGeneratedCode(""); }}
                                        title="Generate New Coupon"
                                        style={{ padding: '0.4rem', border: '1px solid var(--primary)' }}
                                    >
                                        <Ticket size={18} />
                                    </button>
                                )}
                                <button
                                    className="btnSolid"
                                    onClick={() => signOut(auth)}
                                    title="Click to Sign Out"
                                    style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.4rem 1rem' }}
                                >
                                    <img src={user.photoURL || ''} alt="avatar" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                                    <span className={styles.connectText}>{user.displayName?.split(' ')[0]}</span>
                                </button>
                            </div>
                        ) : (
                            <button className="btnSolid" onClick={login} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)' }}>
                                <User size={14} /> <span className={styles.connectText}>Connect Google</span>
                            </button>
                        )}
                    </div>
                </header>

                <Modal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} title="Admin Coupon Generator">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
                        {!generatedCode ? (
                            <form onSubmit={handleGenerateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Tag size={12} /> Coupon Label Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Summer Sale 2026"
                                        className={styles.adminInput}
                                        value={couponForm.name}
                                        onChange={e => setCouponForm({ ...couponForm, name: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Percent size={12} /> Discount
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 50% or 10"
                                            className={styles.adminInput}
                                            value={couponForm.discount}
                                            onChange={e => setCouponForm({ ...couponForm, discount: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Hash size={12} /> Max Quantity
                                        </label>
                                        <input
                                            type="number"
                                            className={styles.adminInput}
                                            value={couponForm.quantity}
                                            onChange={e => setCouponForm({ ...couponForm, quantity: parseInt(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Calendar size={12} /> Expiration Date
                                    </label>
                                    <input
                                        type="date"
                                        className={styles.adminInput}
                                        value={couponForm.expire}
                                        onChange={e => setCouponForm({ ...couponForm, expire: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btnSolid"
                                    disabled={isGenerating}
                                    style={{ marginTop: '1rem', width: '100%', padding: '1rem', gap: '0.5rem' }}
                                >
                                    {isGenerating ? "..." : <Plus size={16} />} Generate Secure Code
                                </button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '1rem', borderRadius: '12px', border: '1px dashed #4ade80' }}>
                                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>SUCCESS! NEW COUPON CREATED</p>
                                    <h2 style={{ fontSize: '1.5rem', letterSpacing: '4px', fontFamily: 'monospace' }}>{generatedCode}</h2>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btnSolid"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedCode);
                                            showToast("Coupon code copied!", "success");
                                        }}
                                    >
                                        <Copy size={16} /> Copy Code
                                    </button>
                                    <button
                                        className="btnOutline"
                                        style={{ flex: 1 }}
                                        onClick={() => { setGeneratedCode(""); setCouponForm({ name: "", discount: "", expire: "", quantity: 100 }); }}
                                    >
                                        Create Another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>

        <motion.div 
          className={styles.subHeader}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className={styles.badge}>
            <span className={styles.statusDot}></span>
            <span className={styles.typingText}>Building the next hit</span>
          </div>
          <div className={`${styles.badge} ${styles.badgeRight}`}>
            🇺🇸 United States
          </div>
          <KoFi />
        </motion.div>

        <motion.section 
          className={styles.hero}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className={`${styles.floatingBox} ${styles.box1}`}>
            <Swords size={32} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box2}`}>
            <Skull size={24} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box3}`}>
            <Target size={40} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box4}`}>
            <Ghost size={28} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box5}`}>
            <Trophy size={36} />
          </div>
          <div className={`${styles.floatingBox} ${styles.box6}`}>
            <Zap size={22} />
          </div>

          <div className={`${styles.avatarWrapper} animateText animateText1`}>
            <div className={`${styles.avatarShape} ${styles.controllerAnim}`}>
              <Gamepad2 size={32} color="#000" />
            </div>
          </div>

          <h1 className={`${styles.title} animateText animateText2`}>
            Creative indie game dev<br />
            team who creates <span className={styles.highlight}><FlipWords words={['universes', 'experiences', 'worlds']} /></span>
          </h1>

          <p className={`${styles.subtitle} animateText animateText3`}>
            A small indie game dev team at California, USA, crafting immersion and high-fidelity experiences for native games. Passionate and player-first.
          </p>

          <div className={`${styles.actionButtons} animateText animateText4`}>
            <button className={`btnSolid ${styles.btnLarge}`}>
              Play Our Games
            </button>
            <button className={`btnOutline ${styles.btnLarge}`}>
              See Portfolio
            </button>
          </div>

          <div className={`${styles.subscribeRow} animateText animateText5`}>
            <input type="email" placeholder="Enter your email for updates" className={styles.emailInput} />
            <button className="btnSolid" style={{ padding: '0 1.5rem', fontSize: '0.75rem' }}>
              <Send size={14} /> Subscribe
            </button>
          </div>
        </motion.section>

        {/* Stats Bar */}
        <motion.div 
          className={styles.statsBar}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={4} suffix="+" /></div>
            <div className={styles.statLabel}>Games Released</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={20} suffix="k+" /></div>
            <div className={styles.statLabel}>Active Players</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={12} /></div>
            <div className={styles.statLabel}>Team Members</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={3} /></div>
            <div className={styles.statLabel}>Years Active</div>
          </div>
        </motion.div>

        <motion.div 
          className={styles.featuresWrapper}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <div className={styles.featureItem}>
            <Paintbrush size={20} className={styles.featureIcon} />
            Expert in Game Design
          </div>
          <div className={styles.featureItem}>
            <Users size={20} className={styles.featureIcon} />
            Loved by 20k+ Players
          </div>
          <div className={styles.featureItem}>
            <MessageSquare size={20} className={styles.featureIcon} />
            Clear Communication
          </div>
        </motion.div>

        <div className={styles.sectionDivider}></div>

        <motion.div
        style={{width:"100%"}}
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           viewport={{ once: true }}
        >
          <GamesCarousel />
        </motion.div>
        
        <AffiliateSection />
        
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
           viewport={{ once: true }}
        >
          <ExtraSections />
        </motion.div>

        <footer className={styles.footer}>
          <div className={styles.footerLeft}>
            <div className={styles.logoIcon}>
              <Gamepad2 size={12} color="#000" />
            </div>
            Crack Origins
          </div>
          <div className={styles.footerLinks}>
            <a href="#about">About</a>
            <a href="#project">Games</a>
            <a href="#projects">Projects</a>
            <a href="#teams">Community</a>
            <a href="#contact">Contact</a>
          </div>
          <div className={styles.footerRight}>
            © 2026 Crack Origins. All rights reserved.
          </div>
        </footer>

      </main>
    </>
  );
}
