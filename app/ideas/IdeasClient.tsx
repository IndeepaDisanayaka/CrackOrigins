'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { fireStore } from '../../lib/firebase';
import { motion } from 'framer-motion';
import { TrendingUp, Bookmark, Heart, ArrowRight, Zap, FileText, LayoutGrid, List, Search, Filter } from 'lucide-react';
import Header from '../../components/layout/Header';
import MobileNav from '../../components/layout/MobileNav';
import Footer from '../../components/layout/Footer';
import Modal from '../../components/Modal';
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

const categories = [
  "Featured Stories", "Lore Explorations", "Original Fiction", "Character Backstories", "Worldbuilding", "Fan Fiction", "Developer Diaries"
];

const sidebarTopics = [
  "Fantasy Fiction", "Sci-Fi Lore", "Cyberpunk", "Horror Stories", "World Building", "Character Studies", "Fan Theories", "Game Mythology"
];

export default function IdeasClient() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'horizontal'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
  const router = useRouter();

  const getSlug = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    const q = query(collection(fireStore, 'ideas'), orderBy('time', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ideasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIdeas(ideasData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ideas: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const res = await login(type, credentials);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  return (
    <main>
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

      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filter Chronicles" maxWidth="500px">
        <div className={styles.filterGroup}>
          <h4>Categories</h4>
          <div className={styles.filterOptions}>
            {categories.map(cat => (
              <label key={cat} className={styles.checkboxLabel}>
                <input type="checkbox" /> {cat}
              </label>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup} style={{ marginTop: '24px' }}>
          <h4>Read Time</h4>
          <div className={styles.filterOptions}>
            <label className={styles.checkboxLabel}><input type="checkbox" /> Under 5 mins</label>
            <label className={styles.checkboxLabel}><input type="checkbox" /> 5-15 mins</label>
            <label className={styles.checkboxLabel}><input type="checkbox" /> 15+ mins</label>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.resetBtn}>Reset</button>
          <button className="btnSolid" onClick={() => setIsFilterModalOpen(false)}>Apply Filters</button>
        </div>
      </Modal>

      <section className={styles.heroSection}>
        <div className={styles.ideasContainer}>
          <div className={styles.heroGrid}>
            <motion.div 
              className={styles.heroTextContent}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className={styles.heroBadge}>
                 <Zap size={14} fill="currentColor" /> THE CREATOR HUB
              </div>
              
              <h1 className={styles.heroTitle}>
                Craft The Universe.<br />
                <span>Publish Your Lore.</span>
              </h1>
              
              <p className={styles.heroSubtitle}>
                Join the ultimate sanctuary for game developers and storytellers. 
                Read exclusive backstories, share your original fiction, and collaborate on world-building.
              </p>
              
              <div className={styles.heroActions}>
                <button className={styles.primaryActionBtn} onClick={() => setIsCreateIdeaOpen(true)}>
                   <FileText size={18} /> Write Article
                </button>
                <button className={styles.secondaryActionBtn}>
                   Explore Library
                </button>
              </div>
              
              <div className={styles.heroStats}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>{ideas.length > 0 ? `${(ideas.length / 1000).toFixed(1)}K+` : '0'}</span>
                  <span className={styles.statLabel}>Stories</span>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>850+</span>
                  <span className={styles.statLabel}>Writers</span>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>50K+</span>
                  <span className={styles.statLabel}>Readers</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              className={styles.heroVisuals}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            >
               <div className={styles.visualCardPrimary}>
                  <div className={styles.vcHeader}>
                    <div className={styles.vcDot} style={{background: '#ff5f56'}}></div>
                    <div className={styles.vcDot} style={{background: '#ffbd2e'}}></div>
                    <div className={styles.vcDot} style={{background: '#27c93f'}}></div>
                  </div>
                  <div className={styles.vcBody}>
                    <div className={styles.vcLine} style={{width: '60%'}}></div>
                    <div className={styles.vcLinePrimary} style={{width: '85%'}}></div>
                    <div className={styles.vcLine} style={{width: '40%'}}></div>
                    <div className={styles.vcLine} style={{width: '70%', marginTop: '20px'}}></div>
                    <div className={styles.vcLine} style={{width: '50%'}}></div>
                    <button className={styles.vcBtn}>PUBLISHING...</button>
                  </div>
               </div>
               
               <div className={styles.visualCardSecondary}>
                 <TrendingUp size={24} color="var(--primary)" />
                 <div>
                   <h5>Trending Now</h5>
                   <p>Cyber-Ascent Lore</p>
                 </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className={styles.ideasContainer}>
        <div className={styles.mainLayout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Discover Topics</h3>
              <div className={styles.tagCloud}>
                {sidebarTopics.map(topic => (
                  <a key={topic} href="#" className={styles.tag}>{topic}</a>
                ))}
              </div>
            </div>
            
            <div className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Staff Picks</h3>
              <div className={styles.staffPicksList}>
                {[1, 2, 3].map(i => (
                  <div key={i} className={styles.staffPickItem}>
                    <div className={styles.staffPickAuthor}>
                      <div className={styles.staffPickAvatar}>
                         <img src={`https://i.pravatar.cc/150?u=editor${i}`} alt="Editor" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '2px' }} />
                      </div>
                      <span>Editor in Chief</span>
                    </div>
                    <h4 className={styles.staffPickTitle}>
                      {i === 1 ? "The Future of Game Development in the Age of AI" : i === 2 ? "How We Built the Crack Origins Universe" : "Top 10 Indie Games of 2026"}
                    </h4>
                  </div>
                ))}
              </div>
              <a href="#" style={{ color: '#feb60c', fontSize: '0.9rem', fontWeight: '800', marginTop: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                See full list <ArrowRight size={16} />
              </a>
            </div>

            <div className={styles.sidebarSection} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
              <div className={styles.footerLinks}>
                <a href="#">Help</a>
                <a href="#">Status</a>
                <a href="#">About</a>
                <a href="#">Careers</a>
                <a href="#">Press</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>
          </aside>

          <div>
            <div className={styles.controlsHeader}>
              <div className={styles.searchFilter}>
                <div className={styles.searchWrapper}>
                  <Search size={16} className={styles.searchIcon} />
                  <input type="text" placeholder="Search stories..." className={styles.searchInput} />
                </div>
                <button className={styles.filterBtn} onClick={() => setIsFilterModalOpen(true)}>
                  <Filter size={16} /> Filter
                </button>
              </div>

              <div className={styles.viewControls}>
                <button 
                  className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  className={`${styles.viewBtn} ${viewMode === 'horizontal' ? styles.viewBtnActive : ''}`}
                  onClick={() => setViewMode('horizontal')}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            
            <section className={`${styles.articleList} ${viewMode === 'horizontal' ? styles.horizontalView : ''}`}>
              {loading ? (
                <div style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                   <div className="premiumLoader" style={{ margin: '0 auto 1rem' }}></div>
                   <p>Gathering Chronicles...</p>
                </div>
              ) : ideas.length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', opacity: 0.5 }}>
                   <FileText size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
                   <p>No stories have been published yet. Be the first!</p>
                </div>
              ) : ideas.map((post, i) => (
                <motion.article 
                  key={post.id} 
                  className={styles.articleCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  onClick={() => router.push(`/ideas/${post.id}/${post.slug || getSlug(post.title || 'story')}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {post.image && (
                    <div className={styles.articleImageWrapper}>
                      <img src={post.image} alt={post.title} />
                    </div>
                  )}

                  <div className={styles.articlePlatformRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                      <FileText size={14} color="var(--primary)" /> 
                      CHRONICLE
                    </div>
                    <motion.div className={styles.articleCategoryBadge} whileHover={{ scale: 1.1, rotate: 2 }}>
                      {post.category || "STORY"}
                    </motion.div>
                  </div>

                  <div className={styles.articleContentWrapper}>
                    <div className={styles.articleText}>
                      <div className={styles.metaRow}>
                        <span>{formatDate(post.time)}</span>
                        <div className={styles.metaDivider} />
                        <span>{post.readTime || "5 min read"}</span>
                      </div>
                      
                      <h2 className={styles.articleTitle}>{post.title}</h2>
                      <p className={styles.articleExcerpt}>{post.description || post.excerpt}</p>
                      
                      <div className={styles.articleAuthor}>
                        <img src={post.authorPhoto || `https://i.pravatar.cc/150?u=${post.authorUid || i}`} alt={post.author} className={styles.authorAvatar} />
                        <span>{post.author}</span>
                      </div>
                    </div>
                    
                    <div className={styles.articleFooter}>
                      <button className={styles.readBtn}>Read Story</button>
                      <div 
                        className={styles.actionIcons} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', gap: '12px' }}
                      >
                        <Bookmark size={18} className={styles.actionIcon} style={{ cursor: 'pointer' }} />
                        <Heart size={18} className={styles.actionIcon} style={{ cursor: 'pointer' }} />
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
