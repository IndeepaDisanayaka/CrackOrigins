'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Share2, MessageSquare, Pencil, Eye, ArrowLeft, Users } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { useToast } from '@/components/Toast';
import { getIdeaSections, saveCollaborationContent, getIdeaById } from '@/lib/idea-actions';
import { parseHtmlToStructured, structuredToHtml } from '@/lib/text-parser';
import IdeaCollaborationsSidebar from '@/components/ideas/IdeaCollaborationsSidebar';

const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const CouponModal = dynamic(() => import('@/components/admin/CouponModal'), { ssr: false });
const AddOfferModal = dynamic(() => import('@/components/admin/AddOfferModal'), { ssr: false });
const ListGameModal = dynamic(() => import('@/components/admin/ListGameModal'), { ssr: false });
const DispatchModal = dynamic(() => import('@/components/admin/DispatchModal'), { ssr: false });

export default function IdeaDetailsClient({ id, slug }: { id: string, slug: string }) {
  const router = useRouter();
  
  const [idea, setIdea] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<'reader' | 'editor'>('reader');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollabSidebarOpen, setIsCollabSidebarOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const { user, isAdmin, login } = useAuth();
  const isAuthor = user && idea && user.uid === idea.authorUid;
  const { showToast } = useToast();
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
        const ideaRes = await getIdeaById(id);
        
        if (ideaRes.success && ideaRes.idea) {
          const data = ideaRes.idea;
          
          // Fetch sections using Server Action to bypass client permission issues
          const sectionsRes = await getIdeaSections(id);
          const sectionsData = sectionsRes.success ? sectionsRes.sections : [];

          setIdea({ 
            id: data._id || id, 
            ...data,
            sections: sectionsData
          });
          
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

  const handleLogin = async (type: 'google' | 'email-login' | 'email-signup', credentials?: { email: string, password: string }) => {
    const res = await login(type, credentials);
    if (res?.success !== false) {
      setIsAuthModalOpen(false);
    }
    return res;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div className="premiumLoader"></div>
      </div>
    );
  }

  const handleSaveContent = async (content: any[], toCloud?: boolean) => {
    // Always update local state
    setIdea((prev: any) => ({ ...prev, sections: content }));

    if (toCloud) {
      if (!user) {
        showToast("Authentication Required", "warning", { subtitle: "You must be logged in to save to the cloud." });
        setIsAuthModalOpen(true);
        return;
      }

      setIsSaving(true);
      try {
        // Transform paragraphs to structured data (typography) as requested
        const structuredSections = content.map(section => ({
          ...section,
          paragraphs: section.paragraphs.map((p: string) => parseHtmlToStructured(p))
        }));

        const res = await saveCollaborationContent(id, {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          photo: user.photoURL || ''
        }, structuredSections);

        if (res.success) {
          showToast(
            res.approved ? "Changes Published" : "Draft Saved", 
            "success", 
            { subtitle: res.approved ? "Your changes are now live!" : "Your contribution has been saved for review." }
          );
        } else {
          showToast("Save Failed", "error", { subtitle: res.error });
        }
      } catch (err: any) {
        console.error("Cloud save error:", err);
        showToast("System Error", "error", { subtitle: "An unexpected error occurred while saving." });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (error || !idea) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', gap: '1rem' }}>
        <h1 style={{ color: 'var(--foreground)' }}>{error || "Idea not found"}</h1>
        <Link href="/ideas" className="btnSolid">BACK TO IDEAS</Link>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      overflowX: 'hidden',
      background: 'var(--background)',
      position: 'relative',
    }}>
      {/* Main content — pushed left when sidebar opens */}
      <motion.div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1 }}
        animate={{ marginRight: (isCollabSidebarOpen && !isMobile) ? '25%' : '0%' }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
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
                
                {/* Author-only Review Panel */}
                {isAuthor && (
                  <button 
                    className={`${styles.actionBtn} ${isCollabSidebarOpen ? styles.actionBtnActive : ''}`}
                    onClick={() => setIsCollabSidebarOpen(true)}
                    title="Review Collaborations"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  >
                    <Users size={18} strokeWidth={2} />
                  </button>
                )}
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
                    <div className={styles.sectionHeaderReader}>
                      <button 
                        className={styles.inlineEditBtn} 
                        onClick={(e) => {
                          e.preventDefault();
                          setTargetSectionId(section.id);
                          setMode('editor');
                        }}
                        title="Edit this section"
                      >
                        <Pencil size={14} />
                        <span>Edit Section</span>
                      </button>
                      <h1 className={styles.blogSectionTitle}>{section.title}</h1>
                    </div>
                    {section.paragraphs.map((para: any, pIndex: number) => {
                      const htmlContent = typeof para === 'string' ? para : structuredToHtml(para);
                      return <p key={pIndex} dangerouslySetInnerHTML={{ __html: htmlContent }} />;
                    })}

                    {/* Section Contributor Info */}
                    {section.authorName && section.authorName !== idea.author && (
                      <div className={styles.sectionContributor}>
                        <img src={section.authorPhoto || `https://i.pravatar.cc/150?u=${section.authorName}`} alt={section.authorName} className={styles.miniAvatar} />
                        <div className={styles.contributorDetails}>
                          <span className={styles.contributorLabel}>Contributed by</span>
                          <span className={styles.contributorName}>{section.authorName}</span>
                        </div>
                      </div>
                    )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span className={styles.editorHint}>Editor Mode Active</span>
                  {isSaving && <span className={styles.savingIndicator}>Saving to Cloud...</span>}
                </div>
                
                <IdeaEditor 
                  id={id}
                  initialContent={idea.sections || []}
                  onSave={handleSaveContent}
                  isSaving={isSaving}
                  targetSectionId={targetSectionId}
                  isAuthor={isAuthor}
                />

                <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--primary)', fontWeight: 800 }}>DRAFT SAVED LOCALLY</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use "SAVE TO CLOUD" to sync your changes to the database.</p>
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
      </motion.div>

      {/* Collaboration Sidebar — sibling, fixed on the right */}
      <IdeaCollaborationsSidebar
        isOpen={isCollabSidebarOpen}
        isMobile={isMobile}
        onClose={() => setIsCollabSidebarOpen(false)}
        ideaId={id}
        currentSections={idea.sections || []}
        onApproved={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
