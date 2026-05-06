'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Bookmark, Heart, ArrowRight, Zap, FileCode, FileText, LayoutGrid, List, Search, Filter, X } from 'lucide-react';
import Header from '../../components/layout/Header';
import MobileNav from '../../components/layout/MobileNav';
import Footer from '../../components/layout/Footer';
import Modal from '../../components/Modal';
import AuthModal from '../../components/AuthModal';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useModals } from '../../lib/contexts/ModalContext';
import styles from './ideas.module.css';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const AdminPanel = dynamic(() => import('../../components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('../../components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('../../components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('../../components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('../../components/admin/DispatchModal'), { ssr: false });

const categories = [
  "Featured Stories", "Lore Explorations", "Original Fiction", "Character Backstories", "Worldbuilding", "Fan Fiction", "Developer Diaries"
];

const trendingPosts = [
  {
    id: 1,
    author: "Alex Rivera",
    title: "The Fall of Aethelgard: A Prelude to the Abyss",
    date: "May 2",
    readTime: "8 min read",
    avatar: "https://i.pravatar.cc/150?u=alex"
  },
  {
    id: 2,
    author: "Sarah Chen",
    title: "Whispers of the Void: Diary of a Scavenger",
    date: "Apr 28",
    readTime: "12 min read",
    avatar: "https://i.pravatar.cc/150?u=sarah"
  },
  {
    id: 3,
    author: "Marcus Thorne",
    title: "Origins: The First AI Rebellion",
    date: "May 1",
    readTime: "6 min read",
    avatar: "https://i.pravatar.cc/150?u=marcus"
  },
  {
    id: 4,
    author: "Elena Vance",
    title: "Blood and Chrome: Life in the Cyber-Slums",
    date: "Apr 30",
    readTime: "15 min read",
    avatar: "https://i.pravatar.cc/150?u=elena"
  },
  {
    id: 5,
    author: "Dr. Aris Varma",
    title: "The Architect's Secret: A Lore Deep Dive",
    date: "May 3",
    readTime: "10 min read",
    avatar: "https://i.pravatar.cc/150?u=aris"
  },
  {
    id: 6,
    author: "Juno Sky",
    title: "Through the Eyes of the Enemy: A Grunt's Tale",
    date: "Apr 29",
    readTime: "9 min read",
    avatar: "https://i.pravatar.cc/150?u=juno"
  }
];

const mainPosts = [
  {
    id: 101,
    author: "Crack Origins Core Team",
    title: "The Last Horizon: Chapter 1",
    excerpt: "The stars burned out one by one. Our colony ship was the last hope, but the AI core had other plans. A deep dive into the official prequel story.",
    date: "May 4",
    readTime: "18 min read",
    image: "https://images.unsplash.com/photo-1614728263952-84ea206f25ab?q=80&w=2070&auto=format&fit=crop",
    category: "Original Fiction",
    avatar: "/favicon-yellow-3.png"
  },
  {
    id: 102,
    author: "Liam O'Neill",
    title: "Shadows of the Neon City",
    excerpt: "Rain slicked the neon streets as Kael hunted the rogue synthetics. A gritty fan fiction set in the world of Cyber-Ascent.",
    date: "May 3",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop",
    category: "Fan Fiction",
    avatar: "https://i.pravatar.cc/150?u=liam"
  },
  {
    id: 103,
    author: "Sofia Rossi",
    title: "Constructing the Old Gods",
    excerpt: "How we developed the pantheon and religious systems for our upcoming RPG. Exploring the myths and legends that shape the game world.",
    date: "May 1",
    readTime: "11 min read",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop",
    category: "Worldbuilding",
    avatar: "https://i.pravatar.cc/150?u=sofia"
  },
  {
    id: 104,
    author: "Vikram Shah",
    title: "The Diary of a Forgotten NPC",
    excerpt: "I stand by the well every day. Heroes come and go, but none ask my name. A creative writing piece exploring the inner thoughts of an RPG merchant.",
    date: "Apr 30",
    readTime: "14 min read",
    image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?q=80&w=2070&auto=format&fit=crop",
    category: "Character Backstories",
    avatar: "https://i.pravatar.cc/150?u=vikram"
  }
];

const sidebarTopics = [
  "Fantasy Fiction", "Sci-Fi Lore", "Cyberpunk", "Horror Stories", "World Building", "Character Studies", "Fan Theories", "Game Mythology"
];

export default function IdeasPage() {
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
    isDispatchModalOpen, setIsDispatchModalOpen
  } = useModals();

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

      {/* Super Quality Hero Section */}
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
                <button className={styles.primaryActionBtn}>
                   <FileText size={18} /> Write Article
                </button>
                <button className={styles.secondaryActionBtn}>
                   Explore Library
                </button>
              </div>
              
              <div className={styles.heroStats}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>1.2K+</span>
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


        {/* Main Layout */}
        <div className={styles.mainLayout}>
          
          {/* Sidebar (Moved to Left) */}
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

          {/* Feed (Moved to Right) */}
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
              {mainPosts.map((post, i) => (
                <motion.article 
                  key={post.id} 
                  className={styles.articleCard}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  onClick={() => window.open(`/ideas/${post.id}`, '_blank')}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.articleContentWrapper}>
                    <div className={styles.articleText}>
                      <div className={styles.metaRow}>
                        <span style={{ color: 'var(--primary)' }}>{post.category}</span>
                        <div className={styles.metaDivider} />
                        <span>{post.date}</span>
                        <div className={styles.metaDivider} />
                        <span>{post.readTime}</span>
                      </div>
                      
                      <h2 className={styles.articleTitle}>{post.title}</h2>
                      <p className={styles.articleExcerpt}>{post.excerpt}</p>
                      
                      <div className={styles.articleAuthor}>
                        <img src={post.avatar} alt={post.author} className={styles.authorAvatar} />
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
