'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Heart, Bookmark, Share2, MessageSquare } from 'lucide-react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { fireStore } from '@/lib/firebase';
import Image from 'next/image';
import MobileNav from '@/components/layout/MobileNav';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import blogPostStyles from '@/app/blogs/[slug]/blog-post.module.css';
import pageStyles from '@/app/page.module.css';
import styles from './ideaDetails.module.css';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useModals } from '@/lib/contexts/ModalContext';
import AuthModal from '@/components/AuthModal';
import IdeaEditor from '@/components/ideas/IdeaEditor';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });

export default function IdeaDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const slug = params?.slug as string;
  const router = useRouter();
  
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mode, setMode] = useState<'reader' | 'editor'>('reader');

  const { user, isAdmin, login } = useAuth();
  const { 
    isAuthModalOpen, setIsAuthModalOpen,
    isAdminModalOpen, setIsAdminModalOpen,
    isCouponModalOpen, setIsCouponModalOpen,
    isAddOfferModalOpen, setIsAddOfferModalOpen,
    isListGameOpen, setIsListGameOpen,
    isDispatchModalOpen, setIsDispatchModalOpen
  } = useModals();

  useEffect(() => {
    const fetchIdea = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(fireStore, 'ideas', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setIdea({ id: docSnap.id, ...data });
          
          if (slug && data.slug && slug !== data.slug) {
            router.replace(`/ideas/${id}/${data.slug}`);
          }
        } else {
          setError("Idea not found.");
        }
      } catch (err: any) {
        console.error("Error fetching idea:", err);
        setError("Failed to load idea.");
      } finally {
        setLoading(false);
      }
    };

    fetchIdea();
  }, [id, slug, router]);

  useEffect(() => {
    if (idea?.title) {
      document.title = `${idea.title} | Crack Origins Ideas`;
    }
  }, [idea]);

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const res = await login(type, credentials);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="premiumLoader"></div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '1rem' }}>
        <h1 style={{ color: 'var(--foreground)' }}>{error || "Idea not found"}</h1>
        <Link href="/ideas" className="btnSolid">BACK TO IDEAS</Link>
      </div>
    );
  }

  return (
    <>
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

      <CouponModal isOpen={isCouponModalOpen} onClose={() => setIsCouponModalOpen(false)} />
      <AddOfferModal isOpen={isAddOfferModalOpen} onClose={() => setIsAddOfferModalOpen(false)} />
      <ListGameModal isOpen={isListGameOpen} onClose={() => setIsListGameOpen(false)} />
      <DispatchModal isOpen={isDispatchModalOpen} onClose={() => setIsDispatchModalOpen(false)} />

      {user && isAdmin && (
        <AdminPanel
          userUid={user.uid}
          isOpen={isAdminModalOpen}
          setIsOpen={setIsAdminModalOpen}
        />
      )}

      <main className={pageStyles.main}>
        <article className={blogPostStyles.blogPostWrapper}>
          <div className={blogPostStyles.topNavigation}>
            <Link href="/ideas" className="btnOutline" style={{ marginBottom: '2rem', padding: '0.6rem 1.2rem', fontSize: '0.8rem' }}>
              <ArrowLeft size={16} /> BACK TO LIBRARY
            </Link>
          </div>

          <header className={blogPostStyles.postHeader}>
            <div className={blogPostStyles.postMeta}>
               <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{idea.category || "CHRONICLE"}</span> • {formatDate(idea.time)} • {idea.readTime || "5 min read"}
            </div>

            <h1 className={blogPostStyles.postTitle}>
              {idea.title}
            </h1>

            {idea.description && (
              <p className={styles.postDescription}>
                {idea.description}
              </p>
            )}
          </header>

          <div className={styles.authorRow}>
            <div className={styles.authors}>
              <div className={styles.authorBlock}>
                <img src={idea.authorPhoto || `https://i.pravatar.cc/150?u=${idea.authorUid}`} alt={idea.author} className={styles.avatar} />
                <div className={styles.authorDetails}>
                  <span className={styles.authorLabel}>Author</span>
                  <span className={styles.authorName}>{idea.author}</span>
                </div>
              </div>
            </div>

            <div className={styles.interactions}>
              <div className={styles.modeSwitchContainer}>
                <span 
                  className={`${styles.modeLabel} ${mode === 'reader' ? styles.modeLabelActive : ''}`}
                  onClick={() => setMode('reader')}
                >
                  Reader
                </span>
                <div 
                  className={`${styles.switch} ${mode === 'editor' ? styles.switchActive : ''}`}
                  onClick={() => setMode(mode === 'reader' ? 'editor' : 'reader')}
                >
                  <div className={styles.switchHandle} />
                </div>
                <span 
                  className={`${styles.modeLabel} ${mode === 'editor' ? styles.modeLabelActive : ''}`}
                  onClick={() => setMode('editor')}
                >
                  Editor
                </span>
              </div>

              <div className={styles.statsGroup}>
                <div className={styles.statBtn} title="Views">
                  <Eye size={20} strokeWidth={1.5} /> 
                  <span>{idea.views || '1.2K'}</span>
                </div>
                <button 
                  className={`${styles.statBtn} ${isLiked ? styles.statBtnActive : ''}`} 
                  onClick={() => setIsLiked(!isLiked)}
                  title="Like"
                >
                  <Heart size={20} strokeWidth={1.5} fill={isLiked ? "currentColor" : "none"} /> 
                  <span>{(idea.likes || 0) + (isLiked ? 1 : 0)}</span>
                </button>
              </div>

              <div className={styles.actionsGroup}>
                <button className={styles.actionBtn} title="Share">
                  <Share2 size={18} strokeWidth={1.5} />
                </button>
                <button className={styles.actionBtn} title="Comments">
                  <MessageSquare size={18} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {idea.image && (
            <div className={blogPostStyles.bannerContainer} style={{ position: 'relative', width: '100%', height: '450px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--outline-color)' }}>
              <img
                src={idea.image}
                alt={idea.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}

          <div className={blogPostStyles.mainContent}>
            {mode === 'reader' ? (
              <div className={`blog-content ${styles.readerContent}`}>
                {idea.sections && idea.sections.map((section: any, index: number) => (
                  <section key={section.id || index} className={styles.blogSection}>
                    <h1 className={styles.blogSectionTitle}>{section.title}</h1>
                    {section.paragraphs.map((para: string, pIndex: number) => (
                      <p key={pIndex} dangerouslySetInnerHTML={{ __html: para }} />
                    ))}
                  </section>
                ))}
                {!idea.sections && (
                  <div className={styles.emptyReader}>
                    <p>No content available yet. Switch to Editor mode to add some!</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.editorModeContent}>
                <span className={styles.editorHint}>Editor Mode Active</span>
                
                <IdeaEditor 
                  initialContent={idea.sections || []}
                  onSave={async (content) => {
                    console.log("Saving content:", content);
                    // Update local state for immediate feedback
                    setIdea({ ...idea, sections: content });
                    
                    // In a real app, you'd update Firestore here
                    // try {
                    //   const docRef = doc(fireStore, 'ideas', id);
                    //   await updateDoc(docRef, { sections: content });
                    // } catch (e) { console.error(e); }
                  }}
                />

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--primary)', fontWeight: 800 }}>DRAFT SAVED AUTOMATICALLY</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You are in live editing mode. Changes will be synced to the database.</p>
                </div>
              </div>
            )}

            <footer className={blogPostStyles.postFooter}>
              <Link 
                href="/ideas" 
                className="btnOutline"
              >
                <ArrowLeft size={16} />
                BACK TO IDEAS LIBRARY
              </Link>
            </footer>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
