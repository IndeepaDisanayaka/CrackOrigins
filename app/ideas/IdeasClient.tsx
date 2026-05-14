'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getIdeas, getIdeaStats } from '../../lib/idea-actions';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Bookmark, Heart, ArrowRight, Zap, 
  FileText, Search, Plus, User, Clock, 
  ChevronRight, Sparkles, Globe, Shield, BadgeCheck, ArrowBigUp
} from 'lucide-react';
import Header from '../../components/layout/Header';
import MobileNav from '../../components/layout/MobileNav';
import Footer from '../../components/layout/Footer';
import AuthModal from '../../components/AuthModal';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import styles from './ideas.module.css';
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('../../components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('../../components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('../../components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('../../components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('../../components/admin/DispatchModal'), { ssr: false });

const sidebarTopics = [
  "Fantasy Fiction", "Sci-Fi Lore", "Cyberpunk", "Horror Stories", "World Building", "Character Studies", "Fan Theories", "Game Mythology"
];

// SVG Graphic Component for Hero
const GamingLogoSVG = () => (
  <svg viewBox="0 0 500 500" className={styles.svgLogo} fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path 
      d="M250 50L450 150V350L250 450L50 350V150L250 50Z" 
      stroke="var(--primary)" 
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
    />
    <motion.path 
      d="M250 100L400 175V325L250 400L100 325V175L250 100Z" 
      stroke="var(--primary)" 
      strokeWidth="1"
      strokeDasharray="10 5"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ originX: "250px", originY: "250px" }}
    />
    <circle cx="250" cy="250" r="40" stroke="var(--primary)" strokeWidth="4" />
    <motion.path 
      d="M250 210V180M250 320V290M180 250H210M290 250H320" 
      stroke="var(--primary)" 
      strokeWidth="4" 
      strokeLinecap="round"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  </svg>
);

export default function IdeasClient() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isAdmin, login } = useAuth();
  const { 
    isAuthModalOpen, setIsAuthModalOpen,
    isAdminModalOpen, setIsAdminModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen,
    isListGameOpen, setIsListGameOpen,
    isDispatchModalOpen, setIsDispatchModalOpen,
    isCreateIdeaOpen, setIsCreateIdeaOpen
  } = useModals();
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({ todayPublications: 0, allPublications: 852, allCollaborations: 52401 });
  const router = useRouter();

  const loadingRef = React.useRef(false);
  const hasMoreRef = React.useRef(true);

  const fetchIdeas = async (currentSkip: number, isNew: boolean) => {
    if (loadingRef.current) return;
    
    if (isNew) setLoading(true);
    else setLoadingMore(true);
    loadingRef.current = true;
    
    try {
      const res: any = await getIdeas(10, currentSkip);
      if (res.success && res.ideas) {
        if (isNew) {
          setIdeas(res.ideas);
        } else {
          setIdeas(prev => [...prev, ...res.ideas]);
        }
        const more = res.ideas.length === 10;
        setHasMore(more);
        hasMoreRef.current = more;
      }
    } catch (error) {
      console.error("Error fetching ideas: ", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getIdeaStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchIdeas(0, true);
    fetchStats();
    
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        if (!loadingRef.current && hasMoreRef.current) {
          setSkip(prev => {
            const nextSkip = prev + 10;
            fetchIdeas(nextSkip, false);
            return nextSkip;
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getSlug = (title: string) => {
    return title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => 
      idea.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.author?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ideas, searchQuery]);

  const userIdeas = useMemo(() => {
    if (!user) return [];
    return ideas.filter(idea => idea.authorUid === user.uid);
  }, [ideas, user]);

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const res = await login(type, credentials);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh', position: 'relative' }}>
      <Header isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <MobileNav isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onLogin={handleLogin} />
      <CouponModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} />
      <AddOfferModal isOpen={isAddOfferModalOpen} onClose={() => setIsAddOfferModalOpen(false)} />
      <ListGameModal isOpen={isListGameOpen} onClose={() => setIsListGameOpen(false)} />
      <DispatchModal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} />

      {user && isAdmin && (
        <AdminPanel userUid={user.uid} isOpen={isAdminModalOpen} setIsOpen={setIsAdminModalOpen} />
      )}

      {/* Hero Section */}
      <section className={styles.heroSection}>
        {/* Background Scrolling Text - Contained within Hero */}
        <div className={styles.scrollingBg}>
          <div className={`${styles.scrollingText} ${styles.animateScroll}`}>
            CRACK ORIGINS • CRACK ORIGINS • CRACK ORIGINS • CRACK ORIGINS • CRACK ORIGINS • CRACK ORIGINS • 
          </div>
        </div>
        <div className={styles.ideasContainer}>
          <div className={styles.heroGrid}>
            <motion.div 
              className={styles.heroTextContent}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '3px' }}>
                <Sparkles size={18} /> THE CHRONICLES
              </div>
              <h1 className={styles.heroTitle}>
                Unleash Your<br />
                <span>Original Lore.</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Dive into the multi-verse of Crack Origins. Share your stories, collaborate with world-builders, and leave your mark on the gaming history.
              </p>
              
              <div className={styles.heroActions}>
                <button className={styles.primaryActionBtn} onClick={() => user ? setIsCreateIdeaOpen(true) : setIsAuthModalOpen(true)}>
                  <Plus size={20} /> New Story
                </button>
                <button className={styles.secondaryActionBtn}>
                  <Globe size={20} /> Explore All
                </button>
              </div>

              <div className={styles.heroStats}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{stats.todayPublications}</span>
                  <span className={styles.statLabel}>Today Published</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{stats.allPublications}</span>
                  <span className={styles.statLabel}>All Chronicles</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{stats.allCollaborations}</span>
                  <span className={styles.statLabel}>Collaborations</span>
                </div>
              </div>
            </motion.div>

            <motion.div 
              className={styles.heroVisuals}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5 }}
            >
              <GamingLogoSVG />
            </motion.div>
          </div>
        </div>
      </section>

      <div className={styles.ideasContainer}>
        <div className={styles.mainLayout}>
          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {user && userIdeas.length > 0 && (
              <div className={styles.userCardsSection}>
                <h3 className={styles.sidebarTitle}>Your Stories</h3>
                <div className={styles.userCardsGrid}>
                  {userIdeas.map(idea => (
                    <div 
                      key={idea.id || idea._id} 
                      className={styles.userCardSmall}
                      onClick={() => router.push(`/ideas/${idea.id || idea._id}/${idea.slug || getSlug(idea.title)}`)}
                    >
                      <h4 className={styles.userCardTitle}>{idea.title}</h4>
                      <span className={styles.userCardDate}>{formatDate(idea.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Last Stories</h3>
              <div className={styles.lastStoriesList}>
                {ideas.slice(0, 4).map((idea, i) => (
                  <div 
                    key={idea.id || idea._id || i} 
                    className={styles.lastStoryItem}
                    onClick={() => router.push(`/ideas/${idea.id || idea._id}/${idea.slug || getSlug(idea.title)}`)}
                  >
                    <div className={styles.lastStoryAuthor}>
                      <img src={idea.authorPhoto || `https://i.pravatar.cc/150?u=${idea.authorUid || i}`} alt={idea.author} className={styles.lastStoryAvatar} />
                      <span className={styles.lastStoryAuthorName}>{idea.author}</span>
                    </div>
                    <h4 className={styles.lastStoryTitle}>{idea.title}</h4>
                  </div>
                ))}
              </div>
              <a href="#" className={styles.seeAllLink}>
                See Full List <ArrowRight size={16} />
              </a>
            </div>

            <div className={styles.sidebarSection} style={{ opacity: 0.5 }}>
              <div className={styles.footerGrid}>
                {['Help', 'Status', 'About', 'Careers', 'Press', 'Privacy'].map(link => (
                  <a key={link} href="#" className={styles.footerLink}>{link}</a>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Feed */}
          <div>
            <div className={styles.controlsHeader}>
              <div className={styles.searchBox}>
                <Search size={18} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Search chronicles..." 
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0', opacity: 0.5 }}>
                <div className="premiumLoader" style={{ marginBottom: '20px' }}></div>
                <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px' }}>Loading the Chronicles...</p>
              </div>
            ) : filteredIdeas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                <FileText size={60} style={{ marginBottom: '20px' }} />
                <p style={{ fontSize: '1.2rem', fontWeight: 900 }}>No chronicles found in this sector.</p>
              </div>
            ) : (
              <div className={styles.articleList}>
                {filteredIdeas.map((idea, i) => (
                  <motion.div 
                    key={idea.id || idea._id}
                    className={styles.articleCard}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => router.push(`/ideas/${idea.id || idea._id}/${idea.slug || getSlug(idea.title)}`)}
                  >
                    <div className={styles.articleImageWrapper}>
                      <img src={idea.image || `https://picsum.photos/seed/${idea.id || i}/800/450`} alt={idea.title} loading="lazy" />
                      <div className={styles.licenseBadge}>
                        {idea.licenseCode ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <BadgeCheck size={12} /> {idea.licenseCode}
                          </div>
                        ) : (
                          "Community"
                        )}
                      </div>
                    </div>
                    <div className={styles.articleContent}>
                      <span className={styles.categoryBadge}>{idea.category || "Original Fiction"}</span>
                      <h2 className={styles.articleTitle}>{idea.title}</h2>
                      <p className={styles.articleExcerpt}>{idea.description || idea.excerpt || "No description available for this chronicle."}</p>
                      
                      <div className={styles.articleMeta}>
                        <div className={styles.authorInfo}>
                          <img src={idea.authorPhoto || `https://i.pravatar.cc/150?u=${idea.authorUid || i}`} alt={idea.author} className={styles.authorAvatar} loading="lazy" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span className={styles.authorName}>{idea.author}</span>
                             <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>{formatDate(idea.time)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
                               <ArrowBigUp size={18} strokeWidth={1.5} />
                               <span style={{ fontSize: '0.75rem', fontWeight: 900 }}>{idea.status?.upvotes || 0}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.8, color: 'var(--foreground)' }}>
                               <ArrowRight size={14} />
                               <span style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '1px' }}>ENTER</span>
                            </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {loadingMore && (
                  <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: '20px' }}>
                    <div className="premiumLoader"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
