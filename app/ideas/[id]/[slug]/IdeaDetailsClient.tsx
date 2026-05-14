'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowBigUp, ArrowBigDown, Bookmark, Share2, MessageSquare, Pencil, Eye, ArrowLeft, Users, BadgeCheck, ShieldAlert, Settings, Square, CheckSquare } from 'lucide-react';
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
import { 
  getIdeaSections, saveCollaborationContent, getIdeaById, 
  incrementIdeaViews, toggleLibrarySave, voteIdea, getIdeaUserStatus,
  updateIdeaMetadata
} from '@/lib/idea-actions';
import { getLicenseByCode } from '@/lib/admin-actions';
import Modal from '@/components/Modal';
import { parseHtmlToStructured, structuredToHtml } from '@/lib/text-parser';
import IdeaCollaborationsSidebar from '@/components/ideas/IdeaCollaborationsSidebar';
import IdeaChatSidebar from '@/components/ideas/IdeaChatSidebar';

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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mode, setMode] = useState<'reader' | 'editor'>('reader');
  const [targetSectionId, setTargetSectionId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollabSidebarOpen, setIsCollabSidebarOpen] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  const [licenseData, setLicenseData] = useState<any>(null);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [pendingSaveParams, setPendingSaveParams] = useState<{ content: any[] } | null>(null);
  const [isSavingConfirmed, setIsSavingConfirmed] = useState(false);
  const [isMetaEditModalOpen, setIsMetaEditModalOpen] = useState(false);
  const [metaFormData, setMetaFormData] = useState({
    description: '',
    image: '',
    isPrivate: false
  });
  const [isUpdatingMeta, setIsUpdatingMeta] = useState(false);

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

          // Device-based view counting validation
          const viewedKey = `chronicle_viewed_${id}`;
          const hasViewed = localStorage.getItem(viewedKey);
          if (!hasViewed) {
             const vRes = await incrementIdeaViews(id);
             if (vRes.success) {
                localStorage.setItem(viewedKey, 'true');
             }
          }

          // Fetch sections using Server Action
          const sectionsRes = await getIdeaSections(id);
          const sectionsData = sectionsRes.success ? sectionsRes.sections : [];

          setIdea({
            id: data._id || id,
            ...data,
            sections: sectionsData
          });

          if (data.licenseCode) {
            const licRes = await getLicenseByCode(data.licenseCode);
            if (licRes.success) setLicenseData(licRes.license);
          }

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
    const fetchUserStatus = async () => {
      if (!user || !id) {
          setIsSaved(false);
          setUserVote(null);
          return;
      }
      try {
        const statusRes = await getIdeaUserStatus(user.uid, id);
        if (statusRes.success) {
            setIsSaved(!!statusRes.isSaved);
            setUserVote(statusRes.userVote as any);
        }
      } catch (err) {
        console.error("Error fetching user status:", err);
      }
    };

    fetchUserStatus();
  }, [user, id]);

  const handleUpdateMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !idea) return;
    setIsUpdatingMeta(true);
    try {
        const res = await updateIdeaMetadata(id, user.uid, metaFormData);
        if (res.success) {
            showToast("Metadata updated successfully.", "success");
            setIdea((prev: any) => ({ ...prev, ...metaFormData }));
            setIsMetaEditModalOpen(false);
        } else {
            showToast(res.error || "Failed to update.", "error");
        }
    } catch (e) {
        showToast("An error occurred.", "error");
    } finally {
        setIsUpdatingMeta(false);
    }
  };

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

  const handleSaveContent = async (content: any[], toCloud?: boolean, bypassAgreement = false) => {
    const isSame = JSON.stringify(content) === JSON.stringify(idea.sections);
    
    if (toCloud && isSame) {
      showToast("No Changes Detected", "info", { subtitle: "You haven't made any modifications to publish yet." });
      return;
    }

    setIdea((prev: any) => ({ ...prev, sections: content }));

    if (toCloud) {
       if (!user) {
         showToast("Authentication Required", "warning", { subtitle: "You must be logged in to save to the cloud." });
         setIsAuthModalOpen(true);
         return;
       }

       if (!isSavingConfirmed && !bypassAgreement) {
         setPendingSaveParams({ content });
         setIsLicenseModalOpen(true);
         return;
       }

       setIsSaving(true);
       try {
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
             res.approved ? "Changes Published" : "Draft Submitted",
             "success",
             { subtitle: res.approved ? "Your changes are now live!" : "Draft submitted! Waiting for author's approval." }
           );
           setIsSavingConfirmed(false);
           setPendingSaveParams(null);
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

  const handleConfirmAgreement = () => {
    setIsSavingConfirmed(true);
    if (pendingSaveParams) {
      handleSaveContent(pendingSaveParams.content, true, true);
    }
    setIsLicenseModalOpen(false);
  };

  const handleEditCollaboration = (collab: any) => {
    if (!collab || !collab.paragraph) return;
    
    setIdea((prev: any) => {
        const newSections = prev.sections.map((s: any) => {
            if (s.id === collab.sectionId) {
                return {
                    ...s,
                    title: collab.subtitle || s.title,
                    paragraphs: collab.paragraph.map((p: any) => 
                        typeof p === 'string' ? p : structuredToHtml(p)
                    )
                };
            }
            return s;
        });
        return { ...prev, sections: newSections };
    });
    
    setTargetSectionId(collab.sectionId);
    setMode('editor');
  };

  const handleToggleSave = async () => {
    if (!user) {
        showToast("Authentication Required", "warning", { subtitle: "Login to save this chronicle to your library." });
        setIsAuthModalOpen(true);
        return;
    }
    
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    
    try {
        const res = await toggleLibrarySave(user.uid, id);
        if (res.success) {
            setIsSaved(!!res.saved);
            showToast(
                res.saved ? "Saved to Library" : "Removed from Library",
                "success",
                { subtitle: res.saved ? "This chronicle is now in your vault." : "Chronicle removed from your collection." }
            );
        } else {
            setIsSaved(prevSaved);
            showToast("Failed to update library status.", "error");
        }
    } catch (e) {
        setIsSaved(prevSaved);
        showToast("Operation Failed", "error");
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    if (!user) {
        showToast("Authentication Required", "warning", { subtitle: "Login to rate this chronicle's uniqueness." });
        setIsAuthModalOpen(true);
        return;
    }

    const prevVote = userVote;
    const prevIdeaState = { ...idea };
    
    const newVote = prevVote === type ? null : type;
    setUserVote(newVote);

    setIdea((prev: any) => {
        const newStatus = { ...prev.status };
        if (prevVote === 'up') newStatus.upvotes = Math.max(0, (newStatus.upvotes || 0) - 1);
        if (prevVote === 'down') newStatus.downvotes = Math.max(0, (newStatus.downvotes || 0) - 1);
        
        if (newVote === 'up') newStatus.upvotes = (newStatus.upvotes || 0) + 1;
        if (newVote === 'down') newStatus.downvotes = (newStatus.downvotes || 0) + 1;
        
        return { ...prev, status: newStatus };
    });

    try {
        const res = await voteIdea(user.uid, user.displayName || 'Operative', id, type);
        if (res.success) {
            setUserVote(res.vote as any);
        } else {
            setUserVote(prevVote);
            setIdea(prevIdeaState);
            showToast("Failed to register vote.", "error");
        }
    } catch (e) {
        setUserVote(prevVote);
        setIdea(prevIdeaState);
        showToast("Voting Failed", "error");
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
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--background)', position: 'relative' }}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', zIndex: 1, width: '100%' }}
        animate={{ width: ((isCollabSidebarOpen || isChatSidebarOpen) && !isMobile) ? '75%' : '100%' }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
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

        <main className={pageStyles.main}>
          <article className={blogPostStyles.blogPostWrapper}>
            <header className={blogPostStyles.postHeader}>
              <div className={blogPostStyles.postMeta}>
                <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{idea.category || "CHRONICLE"}</span> • {formatDate(idea.time)}
              </div>
              <h1 className={blogPostStyles.postTitle}>{idea.title}</h1>
              {idea.description && <p className={styles.postDescription}>{idea.description}</p>}

              {isAuthor && (
                <div style={{ marginTop: '1.5rem' }}>
                    <button 
                        onClick={() => {
                            setMetaFormData({ description: idea.description || '', image: idea.image || '', isPrivate: idea.isPrivate || false });
                            setIsMetaEditModalOpen(true);
                        }}
                        className="btnOutline"
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem', gap: '0.5rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    >
                        <Settings size={14} /> EDIT CHRONICLE INFO
                    </button>
                </div>
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

                <div className={styles.licenseBadgeRow} onClick={() => setIsLicenseModalOpen(true)} style={{ cursor: 'pointer' }}>
                  <div className={styles.licenseLabel}><BadgeCheck size={14} color="var(--primary)" /><span>LICENSE</span></div>
                  <div className={styles.licenseValue}>{idea.licenseCode || "COMMUNITY"}</div>
                </div>
              </div>

              <div className={styles.interactions}>
                <div className={styles.modeSwitchContainer}>
                  <span className={`${styles.modeLabel} ${mode === 'reader' ? styles.modeLabelActive : ''}`} onClick={() => setMode('reader')}>Reader</span>
                  <div className={`${styles.switch} ${mode === 'editor' ? styles.switchActive : ''}`} onClick={() => setMode(mode === 'reader' ? 'editor' : 'reader')}>
                    <div className={styles.switchHandle} />
                  </div>
                  <span className={`${styles.modeLabel} ${mode === 'editor' ? styles.modeLabelActive : ''}`} onClick={() => setMode('editor')}>Editor</span>
                </div>

                <div className={styles.statsGroup}>
                  <div className={styles.statBtn} title="Views"><Eye size={20} strokeWidth={1.5} /><span>{idea.status?.views || 0}</span></div>
                  <div className={styles.votingCluster}>
                    <button className={`${styles.statBtn} ${userVote === 'up' ? styles.statBtnActiveUp : ''}`} onClick={() => handleVote('up')} title="Unique (Upvote)">
                      <ArrowBigUp size={22} strokeWidth={userVote === 'up' ? 0 : 1.5} fill={userVote === 'up' ? "var(--primary)" : "none"} />
                      <span>{idea.status?.upvotes || 0}</span>
                    </button>
                    <button className={`${styles.statBtn} ${userVote === 'down' ? styles.statBtnActiveDown : ''}`} onClick={() => handleVote('down')} title="Redundant (Downvote)">
                      <ArrowBigDown size={22} strokeWidth={userVote === 'down' ? 0 : 1.5} fill={userVote === 'down' ? "#ff4d4d" : "none"} />
                      <span>{idea.status?.downvotes || 0}</span>
                    </button>
                  </div>
                </div>

                <div className={styles.actionsGroup}>
                  <button className={`${styles.actionBtn} ${isSaved ? styles.actionBtnSaved : ''}`} onClick={handleToggleSave} title="Save Vault"><Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /></button>
                  <button className={styles.actionBtn} onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!', 'success'); }} title="Share"><Share2 size={18} /></button>
                  <button className={`${styles.actionBtn} ${isChatSidebarOpen ? styles.actionBtnActive : ''}`} onClick={() => { setIsChatSidebarOpen(!isChatSidebarOpen); if (!isChatSidebarOpen) setIsCollabSidebarOpen(false); }} title="Comments"><MessageSquare size={18} /></button>
                  <button className={`${styles.actionBtn} ${isCollabSidebarOpen ? styles.actionBtnActive : ''}`} onClick={() => { setIsCollabSidebarOpen(!isCollabSidebarOpen); if (!isCollabSidebarOpen) setIsChatSidebarOpen(false); }} title="Collaborations" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}><Users size={18} /></button>
                </div>
              </div>
            </div>

            {idea.image && (
              <div className={blogPostStyles.bannerContainer} style={{ width: '100%', height: '450px', overflow: 'hidden', border: '1px solid var(--outline-color)' }}>
                <img src={idea.image} alt={idea.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
            )}

            <div className={blogPostStyles.mainContent}>
              {mode === 'reader' ? (
                <div className={`blog-content ${styles.readerContent}`}>
                  {idea.sections && idea.sections.map((section: any, index: number) => (
                    <section key={section.id || index} className={styles.blogSection}>
                      <div className={styles.sectionHeaderReader}>
                        <button className={styles.inlineEditBtn} onClick={() => { setTargetSectionId(section.id); setMode('editor'); }} title="Edit Section"><Pencil size={14} /><span>Edit Section</span></button>
                        <h1 className={styles.blogSectionTitle}>{section.title}</h1>
                      </div>
                      {section.paragraphs.map((para: any, pIndex: number) => (
                        <p key={pIndex} dangerouslySetInnerHTML={{ __html: typeof para === 'string' ? para : structuredToHtml(para) }} />
                      ))}
                      {section.collaborators && section.collaborators.length > 0 && (
                          <div className={styles.sectionCollaborators}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                                  <Users size={12} style={{ color: 'var(--primary)' }} /><span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Contributors</span>
                              </div>
                              <div className={styles.collaboratorAvatars}>
                                  {section.collaborators.slice(0, 3).map((collab: any) => (
                                      <div key={collab.uid} className={styles.collabAvatarWrapper} title={collab.name}>
                                          <img src={collab.photo || `https://i.pravatar.cc/150?u=${collab.uid}`} alt={collab.name} className={styles.collabAvatar} />
                                          <div className={styles.collabTooltip}>{collab.name}</div>
                                      </div>
                                  ))}
                                  {section.collaborators.length > 3 && <div className={styles.moreCollabs}>+{section.collaborators.length - 3}</div>}
                              </div>
                          </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <div className={styles.editorModeContent}>
                  <IdeaEditor id={id} initialContent={idea.sections || []} onSave={handleSaveContent} isSaving={isSaving} targetSectionId={targetSectionId} isAuthor={isAuthor} />
                </div>
              )}
              <footer className={blogPostStyles.postFooter}>
                <Link href="/ideas" className="btnOutline"><ArrowLeft size={16} /> BACK TO LIBRARY</Link>
              </footer>
            </div>
          </article>
        </main>
        <Footer />
      </motion.div>

      <IdeaCollaborationsSidebar
        isOpen={isCollabSidebarOpen} isMobile={isMobile} onClose={() => setIsCollabSidebarOpen(false)}
        ideaId={id} currentSections={idea.sections || []} onApproved={() => router.refresh()}
        isAuthor={isAuthor === true} onEditCollaboration={handleEditCollaboration}
      />

      <IdeaChatSidebar isOpen={isChatSidebarOpen} onClose={() => setIsChatSidebarOpen(false)} ideaTitle={idea.title} ideaId={id} isMobile={isMobile} />

      <Modal isOpen={isLicenseModalOpen} onClose={() => { setIsLicenseModalOpen(false); setPendingSaveParams(null); }} title="Chronicle License Information" maxWidth="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)', borderRadius: '8px' }}>
             <BadgeCheck size={32} color="var(--primary)" />
             <div>
               <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 950 }}>{licenseData?.code || idea.licenseCode || "COMMUNITY OPEN"}</h3>
               <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{licenseData?.name || "Standard Agency Agreement"}</p>
             </div>
          </div>
          <div style={{ padding: '0 0.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--primary)' }}>Usage Details</h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.9 }}>{licenseData?.description || "Shared collective intelligence agreement."}</p>
          </div>
          {pendingSaveParams && (
            <div style={{ marginTop: '1rem', padding: '1.25rem', border: '2px solid var(--primary)', borderRadius: '12px', background: 'rgba(var(--primary-rgb), 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}><ShieldAlert size={20} color="var(--primary)" /><span style={{ fontWeight: 900, fontSize: '0.9rem' }}>AGREEMENT</span></div>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>Push changes to the cloud under this license?</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btnSolid" style={{ flex: 1, padding: '0.8rem' }} onClick={handleConfirmAgreement}>I AGREE & PUBLISH</button>
                <button className="btnOutline" style={{ flex: 1, padding: '0.8rem' }} onClick={() => { setIsLicenseModalOpen(false); setPendingSaveParams(null); }}>CANCEL</button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isMetaEditModalOpen} onClose={() => setIsMetaEditModalOpen(false)} title="Edit Chronicle Info" maxWidth="600px">
          <form onSubmit={handleUpdateMeta} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>DESCRIPTION</label>
                  <textarea className={styles.metaInput} style={{ minHeight: '120px', resize: 'vertical', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--outline-color)', borderRadius: '4px', padding: '0.8rem' }} value={metaFormData.description} onChange={e => setMetaFormData({ ...metaFormData, description: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>COVER IMAGE URL</label>
                  <input type="url" className={styles.metaInput} style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--outline-color)', borderRadius: '4px', padding: '0.8rem' }} value={metaFormData.image} onChange={e => setMetaFormData({ ...metaFormData, image: e.target.value })} />
              </div>
              <div onClick={() => setMetaFormData({ ...metaFormData, isPrivate: !metaFormData.isPrivate })} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', border: '1px solid var(--outline-color)', borderRadius: '8px', cursor: 'pointer', borderColor: metaFormData.isPrivate ? 'var(--primary)' : 'var(--outline-color)', background: metaFormData.isPrivate ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent' }}>
                  <div style={{ color: metaFormData.isPrivate ? 'var(--primary)' : 'var(--text-muted)' }}>{metaFormData.isPrivate ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                  <div><div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Private Chronicle</div><div style={{ fontSize: '0.65rem', opacity: 0.6 }}>Direct link access only.</div></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setIsMetaEditModalOpen(false)} className="btnOutline">Cancel</button>
                  <button type="submit" disabled={isUpdatingMeta} className="btnSolid">{isUpdatingMeta ? "Syncing..." : "Update Meta"}</button>
              </div>
          </form>
      </Modal>
    </div>
  );
}
