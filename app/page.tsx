'use client';
import styles from './page.module.css';
import {
  Gamepad2, Users, MessageSquare, Paintbrush, Send,
  Skull, Swords, Ghost, Trophy, Target, Zap, User,
  Ticket, Plus, Calendar, Percent, Hash, Copy, Tag,
  Menu, X, Briefcase
} from 'lucide-react';
import GamesCarousel from '../components/GamesCarousel';
import ExtraSections from '../components/ExtraSections';
import AffiliateSection from '../components/AffiliateSection';
import ThemeToggle from '../components/ThemeToggle';
import { auth } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import Counter from '../components/Counter';
import FlipWords from '../components/FlipWords';
import KoFi from '@/lib/co-fi';
import Modal from '../components/Modal';
import { syncUserRecord, checkAdminStatus, createCoupon, createOffer } from '@/lib/admin-actions';
import { useToast } from '../components/Toast';
import { useSearchParams } from 'next/navigation';
import LiveCursors from '../components/LiveCursors';
import Link from 'next/link';
import AuthModal from '../components/AuthModal';


const provider = new GoogleAuthProvider();

export const login = (referralId?: string | null, country?: string) => signInWithPopup(auth, provider)
  .then(async (result) => {
    const user = result.user;

    // Server-side database write (Secure from client network tab)
    return await syncUserRecord(user.uid, {
      isOwner: false,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      created: user.metadata.creationTime,
      last: user.metadata.lastSignInTime,
      country: country,
      referralId: referralId
    });

  }).catch((error) => {
    console.error("Login Error:", error);
    return { success: false, error: "Authentication failed" };
  });

function HomeContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAddOfferModalOpen, setIsAddOfferModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [userCountry, setUserCountry] = useState<{ name: string} | null>(null);
  const { showToast } = useToast();

  // Form states
  const [couponForm, setCouponForm] = useState({
    name: "",
    discount: "",
    expire: "",
    quantity: 100
  });

  const [offerForm, setOfferForm] = useState({
    id: "",
    title: "",
    originalPrice: "",
    discount: "",
    expire: "",
    quantity: 1,
    operatingSystem: "windows",
    platform: "steam"
  });

  const refreshUserStatus = async () => {
    if (auth.currentUser) {
      const res = await checkAdminStatus(auth.currentUser.uid);
      setIsAdmin(res.isOwner);
      setAffiliateId(res.affiliateId);
      setDiscount(res.discount || 0);
      setAffiliateCount(res.affiliateCount || 0);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        const res = await checkAdminStatus(u.uid);
        setIsAdmin(res.isOwner);
        setAffiliateId(res.affiliateId);
        setDiscount(res.discount || 0);
        setAffiliateCount(res.affiliateCount || 0);
      } else {
        setIsAdmin(false);
        setAffiliateId(null);
        setDiscount(0);
        setAffiliateCount(0);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const getCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (data && data.country_name) {
          setUserCountry({ 
            name: data.country_name,
          });
        }
      } catch (e) {
        // Silently fail or use a fallback if needed
        console.warn("Geolocator (ipapi) failed. Using default.");
        // Optional: Try a second service
        try {
          const res2 = await fetch("https://api.ipify.org?format=json");
          if (res2.ok) {
            setUserCountry({ name: "Global" }); 
          }
        } catch (e2) {}
      }
    };
    getCountry();
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

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!offerForm.id || !offerForm.title || !offerForm.originalPrice || !offerForm.discount || !offerForm.expire) {
      showToast("Please fill all fields.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await createOffer(user.uid, {
        ...offerForm,
        originalPrice: Number(offerForm.originalPrice),
        quantity: Number(offerForm.quantity)
      });
      if (result.success) {
        showToast("Offer added successfully!", "success");
        setIsAddOfferModalOpen(false);
        setOfferForm({ id: "", title: "", originalPrice: "", discount: "", expire: "", quantity: 1, operatingSystem: "windows", platform: "steam" });
      } else {
        showToast(result.error || "Failed to add offer.", "error");
      }
    } catch (err) {
      showToast("Error adding offer.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerLogin = async () => {
    // 1. Attempt to get country
    let country = "Unknown";
    try {
      const locResponse = await fetch("https://ipapi.co/json/");
      if (locResponse.ok) {
        const locData = await locResponse.json();
        country = locData.country_name || "Unknown";
      }
    } catch (e) { }

    // 2. Get referral code from URL
    const refId = searchParams?.get('ref');

    const res = await login(refId, country);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    if (res?.success && 'affiliateId' in res) {
      setAffiliateId(res.affiliateId as string);
      if (auth.currentUser) {
        const profile = await checkAdminStatus(auth.currentUser.uid);
        setDiscount(profile.discount);
        setAffiliateCount(profile.affiliateCount);
      }
    }
  };

  return (
    <>
      <div className={styles.splashScreen}>
        <div className={styles.splashText}>
          Crack <span>Origins</span>
        </div>
      </div>

      <LiveCursors />
      <div className={styles.backgroundAnimation}></div>

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.navLinks}>
            <a href="#about" className={styles.link}>About</a>
            <a href="#project" className={styles.link}>Games</a>
            <a href="#Affiliates" className={styles.link}>Affiliates</a>
            <a href="#Keys" className={styles.link}>Keys</a>
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
                  <>
                  <button
                    className="btnOutline"
                    onClick={() => { setIsAdminModalOpen(true); setGeneratedCode(""); }}
                    title="Generate New Coupon"
                    style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                  >
                    <Ticket size={18} />
                  </button>
                  <button
                    className="btnOutline"
                    onClick={() => { setIsAddOfferModalOpen(true); }}
                    title="Add New Game Offer"
                    style={{ padding: '0.6rem', border: '1px solid var(--primary)', cursor: 'pointer' }}
                  >
                    <Swords size={18} />
                  </button>
                  </>
                )}
                <button
                  className="btnSolid"
                  onClick={() => signOut(auth)}
                  title="Click to Sign Out"
                  style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.6rem 1.2rem', cursor: 'pointer' }}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" style={{ width: 18, height: 18, borderRadius: '50%' }} />
                  ) : (
                    <User size={18} />
                  )}
                  <span className={styles.connectText}>{user.displayName?.split(' ')[0]}</span>
                </button>
              </div>
            ) : (
              <button className="btnSolid" onClick={() => setIsAuthModalOpen(true)} style={{ gap: '0.4rem', border: '1px solid var(--outline-color)', padding: '0.6rem 1.2rem', cursor: 'pointer' }}>
                <User size={14} /> <span className={styles.connectText}>Connect Google</span>
              </button>
            )}

            <button 
              className={styles.menuToggle} 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div className={`${styles.mobileNav} ${isMobileMenuOpen ? styles.mobileNavOpen : ''}`}>
             <div className={styles.mobileNavHeader}>
               <div className={styles.logo}>
                 <div className={styles.logoIcon}>
                   <Gamepad2 size={16} color="#000" />
                 </div>
                 <span>Crack Origins</span>
               </div>
               <button className={styles.menuToggle} onClick={() => setIsMobileMenuOpen(false)}>
                 <X size={24} />
               </button>
             </div>
             <div className={styles.mobileNavLinks}>
                <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <Users size={18} /> About
                </a>
                <a href="#project" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <Gamepad2 size={18} /> Games
                </a>
                <a href="#projects" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <Briefcase size={18} /> Projects
                </a>
                <a href="#Affiliates" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <Briefcase size={18} /> Affiliates
                </a>
                <a href="#Keys" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <Briefcase size={18} /> Keys
                </a>
                <a href="#teams" onClick={() => setIsMobileMenuOpen(false)} className={styles.mobileLink}>
                   <MessageSquare size={18} /> Community
                </a>
             </div>

             <div className={styles.mobileNavFooter}>
                {user ? (
                   <div className={styles.mobileUser}>
                      <img src={user.photoURL || ""} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                      <span>{user.displayName}</span>
                   </div>
                ) : (
                   <div className={styles.mobileUser}>
                      <User size={20} />
                      <span>Guest User</span>
                   </div>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                   <Link href="/terms" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 700, textTransform: 'uppercase' }}>
                      Terms & Privacy
                   </Link>
                </div>
                 <p>© 2026 Crack Origins Studio. All rights reserved.</p>
             </div>
          </div>
        </header>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          onLogin={triggerLogin} 
        />

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

        <Modal isOpen={isAddOfferModalOpen} onClose={() => setIsAddOfferModalOpen(false)} title="Add New Game Offer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
            <form onSubmit={handleAddOffer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   Steam App ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1245620"
                  className={styles.adminInput}
                  value={offerForm.id}
                  onChange={e => setOfferForm({ ...offerForm, id: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                   Game Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Elden Ring"
                  className={styles.adminInput}
                  value={offerForm.title}
                  onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Original Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="10.00"
                    className={styles.adminInput}
                    value={offerForm.originalPrice}
                    onChange={e => setOfferForm({ ...offerForm, originalPrice: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Discount
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10% or -10%"
                    className={styles.adminInput}
                    value={offerForm.discount}
                    onChange={e => setOfferForm({ ...offerForm, discount: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    OS
                  </label>
                  <input
                    type="text"
                    className={styles.adminInput}
                    value={offerForm.operatingSystem}
                    onChange={e => setOfferForm({ ...offerForm, operatingSystem: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className={styles.adminInput}
                    value={offerForm.quantity}
                    onChange={e => setOfferForm({ ...offerForm, quantity: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Expiration Date
                </label>
                <input
                  type="date"
                  className={styles.adminInput}
                  value={offerForm.expire}
                  onChange={e => setOfferForm({ ...offerForm, expire: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btnSolid"
                disabled={isGenerating}
                style={{ marginTop: '1rem', width: '100%', padding: '1rem', gap: '0.5rem' }}
              >
                {isGenerating ? "..." : <Plus size={16} />} Add New Offer
              </button>
            </form>
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
            {userCountry ? (
              userCountry.name
            ) : (
              "Tracking Space"
            )}
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
            CRACK ORIGINS:<br />
            <span className={styles.highlight}>A NEW PAGE IN HISTORY.</span>
          </h1>
          <p className={`${styles.subtitle} animateText animateText3`}>
            Crack Origins (CO's) is an indie game team on a mission to redefine the industry. By turning the page on traditional development and embracing a culture of bold innovation, we are rising to create the next unique masterpiece guided by community ideas.
          </p>

          <div className={`${styles.actionButtons} animateText animateText4`}>
            <a href='#project' className={`btnSolid ${styles.btnLarge}`} style={{textDecoration:"none"}}>
              Play Our Games
            </a>
            <a href='#about' className={`btnOutline ${styles.btnLarge}`} style={{textDecoration:"none"}}>
              See Portfolio
            </a>
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
            <div className={styles.statNumber}><Counter end={10} suffix="k+" /></div>
            <div className={styles.statLabel}>Active Players</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={5} suffix="k+"/></div>
            <div className={styles.statLabel}>Games Sold</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}><Counter end={1} /></div>
            <div className={styles.statLabel}>Upcomming</div>
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
          style={{ width: "100%" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <GamesCarousel />
        </motion.div>

        <AffiliateSection
          affiliateId={affiliateId}
          friendsCount={affiliateCount}
          discount={discount}
          onRefresh={refreshUserStatus}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
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
            <Link href="/terms">Terms & Privacy</Link>
          </div>
          <div className={styles.footerRight}>
            © 2026 Crack Origins. All rights reserved.
          </div>
        </footer>

      </main>
    </>
  );
}
export default function Home() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f', color: '#fff' }}>Loading Crack Origins...</div>}>
      <HomeContent />
    </Suspense>
  );
}
