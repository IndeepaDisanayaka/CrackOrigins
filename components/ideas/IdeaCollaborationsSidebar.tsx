import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Check, Eye, User, Loader2, AlertTriangle, MessageSquare, Clock, 
  CheckCircle2, Trash2, Edit3, Save, Type, Bold, Italic, 
  Underline, Strikethrough, Maximize2, Minimize2, Highlighter, Plus,
  CheckSquare, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../Modal';
import { getPendingCollaborations, getAllCollaborations, approveCollaboration, unapproveCollaboration, deleteCollaboration, updateCollaboration } from '@/lib/idea-actions';
import { structuredToHtml, parseHtmlToStructured } from '@/lib/text-parser';
import { useToast } from '../Toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import styles from './idea-collaborations-sidebar.module.css';

interface Collaboration {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  subtitle: string;
  paragraph: any[];
  sectionId: string;
  time: number;
  isApproved?: boolean;
}

interface IdeaCollaborationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string;
  onApproved?: () => void;
  currentSections: any[];
  isMobile?: boolean;
  isAuthor: boolean;
  onEditCollaboration?: (collab: Collaboration) => void;
}

const EditableQuickPara = ({
    initialValue,
    onBlur,
    onRemove,
    showRemove
  }: {
    initialValue: string,
    onBlur: (val: string) => void,
    onRemove: () => void,
    showRemove: boolean
  }) => {
    const contentRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
      if (contentRef.current && contentRef.current.innerHTML !== initialValue) {
        contentRef.current.innerHTML = initialValue;
      }
    }, [initialValue]);
  
    return (
      <div className={styles.quickParaWrapper}>
        <div
          ref={contentRef}
          className={styles.editableQuickPara}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => onBlur(e.currentTarget.innerHTML)}
          data-placeholder="Start typing paragraph..."
        />
        {showRemove && (
            <button onClick={onRemove} className={styles.removeParaBtn} title="Remove Paragraph">
                <Trash2 size={14} />
            </button>
        )}
      </div>
    );
  };

export default function IdeaCollaborationsSidebar({
  isOpen,
  onClose,
  ideaId,
  onApproved,
  currentSections,
  isMobile = false,
  isAuthor,
  onEditCollaboration
}: IdeaCollaborationsSidebarProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const originalSubtitle = useRef("");
  const originalParagraphs = useRef<string[]>([]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string }>({ open: false, id: "" });

  const [activeStyles, setActiveStyles] = useState<{ [key: string]: boolean }>({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

  // Quick Edit States
  const [isQuickEditing, setIsQuickEditing] = useState(false);
  const [editedSubtitle, setEditedSubtitle] = useState("");
  const [editedParagraphs, setEditedParagraphs] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    const handleSelectionChange = () => {
      setActiveStyles({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    setActiveStyles(prev => ({
        ...prev,
        [command]: document.queryCommandState(command)
    }));
  };

  const applyHighlight = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
  };

  const { showToast } = useToast();
  const { user } = useAuth();

  const loadCollaborations = async (tab: 'pending' | 'all') => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = tab === 'pending'
        ? await getPendingCollaborations(ideaId)
        : await getAllCollaborations(ideaId);
      if (res.success && res.collaborations) {
        if (!isAuthor && user) {
          // If not author, we filter based on status for the two tabs
          // activeTab === 'pending' means 'Unapproved'
          // activeTab === 'all' means 'Approved'
          const filtered = res.collaborations.filter((c: any) => {
              const isOwn = c.authorId === user.uid;
              if (tab === 'pending') return isOwn && !c.isApproved;
              return isOwn && c.isApproved;
          });
          setCollaborations(filtered);
        } else {
          setCollaborations(res.collaborations);
        }
      }
    } catch (e) {
      console.error('Error loading collaborations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ideaId) {
      loadCollaborations(activeTab);
    }
  }, [isOpen, ideaId, activeTab, isAuthor, user]);

  const filteredCollaborations = useMemo(() => {
    if (showOnlyMine && user) {
        return collaborations.filter(collab => collab.authorId === user.uid);
    }
    return collaborations;
  }, [collaborations, showOnlyMine, user]);

  const handleApprove = async (id: string) => {
    if (!isAuthor) return;
    setIsApproving(true);
    try {
      const res = await approveCollaboration(id);
      if (res.success) {
        showToast('Collaboration approved and published.', 'success');
        setCollaborations((prev: Collaboration[]) =>
          prev.filter((c: Collaboration) => c.id !== id)
        );
        setSelectedCollab(null);
        if (onApproved) onApproved();
      } else {
        showToast(res.error || 'Failed to approve.', 'error');
      }
    } catch (e) {
      showToast('Approval failed.', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleUnapprove = async (id: string) => {
    if (!isAuthor) return;
    setIsUnapproving(true);
    try {
      const res = await unapproveCollaboration(id);
      if (res.success) {
        showToast('Collaboration unapproved.', 'success');
        loadCollaborations(activeTab);
        setSelectedCollab(null);
        if (onApproved) onApproved();
      } else {
        showToast(res.error || 'Failed to unapprove.', 'error');
      }
    } catch (e) {
      showToast('Unapproval failed.', 'error');
    } finally {
      setIsUnapproving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ open: true, id });
  };

  const confirmDelete = async () => {
    if (!user || !deleteConfirm.id) return;
    setIsDeleting(true);
    try {
        const res = await deleteCollaboration(deleteConfirm.id, user.uid);
        if (res.success) {
            showToast("Collaboration deleted successfully.", "success");
            setCollaborations(prev => prev.filter(c => c.id !== deleteConfirm.id));
            setSelectedCollab(null);
            setDeleteConfirm({ open: false, id: "" });
            if (onApproved) onApproved();
        } else {
            showToast(res.error || "Failed to delete.", "error");
        }
    } catch (e) {
        showToast("Deletion failed.", "error");
    } finally {
        setIsDeleting(false);
    }
  };

  const startQuickEdit = (collab: Collaboration) => {
      setEditedSubtitle(collab.subtitle);
      // Convert structured text to HTML for the editor
      const paras = collab.paragraph.map((p: any) => {
        if (!p) return "";
        if (typeof p === 'string') return p;
        if (p.text) return structuredToHtml(p);
        return p.content || "";
      });
      const finalParas = paras.length > 0 ? paras : [""];
      setEditedParagraphs(finalParas);
      
      // Store original values for change detection
      originalSubtitle.current = collab.subtitle;
      originalParagraphs.current = finalParas;
      
      setIsQuickEditing(true);
  };

  const addQuickPara = () => {
    setEditedParagraphs([...editedParagraphs, ""]);
  };

  const removeQuickPara = (index: number) => {
    setEditedParagraphs(editedParagraphs.filter((_, i) => i !== index));
  };

  const updateQuickPara = (index: number, val: string) => {
    const next = [...editedParagraphs];
    next[index] = val;
    setEditedParagraphs(next);
  };

  const handleUpdate = async () => {
      if (!selectedCollab || !user) return;
      
      // Check if anything changed
      const hasSubtitleChanged = editedSubtitle !== originalSubtitle.current;
      const hasParasChanged = JSON.stringify(editedParagraphs) !== JSON.stringify(originalParagraphs.current);
      
      if (!hasSubtitleChanged && !hasParasChanged) {
        showToast("No Changes Detected", "info", { subtitle: "Please modify the content before updating." });
        return;
      }

      setIsUpdating(true);
      try {
          const parsedParagraphs = editedParagraphs.map(html => {
              return parseHtmlToStructured(html);
          });

          const res = await updateCollaboration(selectedCollab.id, user.uid, {
              subtitle: editedSubtitle,
              paragraph: parsedParagraphs
          });

          if (res.success) {
              showToast("Changes saved successfully.", "success");
              setIsQuickEditing(false);
              loadCollaborations(activeTab);
              setSelectedCollab(null);
          } else {
              showToast(res.error || "Update failed.", "error");
          }
      } catch (e) {
          console.error("Update Error:", e);
          showToast("System error during update.", "error");
      } finally {
          setIsUpdating(false);
      }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.container}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: isMobile ? '100%' : '25%' }}
          >
            {/* Header */}
            <div className={styles.header}>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={24} />
              </button>
              <div className={styles.badge}>
                <MessageSquare size={14} /> {isAuthor ? "Collaborations" : "Your Publications"}
              </div>
              <div className={styles.headerTitle}>
                <h3>{isAuthor ? "Review" : "Manage"} <span>Edits</span></h3>
              </div>

              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  {isAuthor ? "Pending" : "Unapproved"}
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  {isAuthor ? "All" : "Approved"}
                </button>
              </div>
            </div>

            {isAuthor && activeTab === 'all' && (
              <div 
                  onClick={() => setShowOnlyMine(!showOnlyMine)}
                  style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.6rem', 
                      padding: '0.75rem 1rem', 
                      margin: '0 1rem 1rem',
                      background: 'rgba(var(--primary-rgb), 0.03)',
                      border: `1px solid ${showOnlyMine ? 'var(--primary)' : 'var(--outline-color)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                  }}
              >
                  <div style={{ color: showOnlyMine ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {showOnlyMine ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: showOnlyMine ? 'var(--primary)' : 'var(--foreground)' }}>
                      ONLY MY PUBLISHES
                  </span>
              </div>
            )}

            {/* List */}
            <div className={styles.listArea}>
              {loading ? (
                <div className={styles.loading}>
                  <Loader2 size={24} className="animate-spin" />
                  <p>Loading...</p>
                </div>
              ) : filteredCollaborations.length > 0 ? (
                filteredCollaborations.map((collab: Collaboration) => (
                  <div key={collab.id} className={styles.collabCard}>
                    <div className={styles.collabHeader}>
                      <div className={styles.userIcon}>
                        {collab.authorPhoto ? (
                          <img src={collab.authorPhoto} alt={collab.authorName} loading="lazy" />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className={styles.collabMeta}>
                        <span className={styles.userName}>{collab.authorName}</span>
                        <span className={styles.timeLabel}>
                          <Clock size={10} />
                          {collab.time ? new Date(collab.time).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      {collab.isApproved && (
                        <CheckCircle2 size={16} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
                      )}
                    </div>
                    <div className={styles.collabTitle}>
                      {collab.subtitle || 'Untitled Section'}
                    </div>
                    <button
                      className={styles.readBtn}
                      onClick={() => {
                        setSelectedCollab(collab);
                        setIsQuickEditing(false);
                      }}
                    >
                      <Eye size={14} /> Review Edit
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>
                  <AlertTriangle size={32} opacity={0.2} />
                  <p>
                    {isAuthor 
                      ? (activeTab === 'pending' ? 'No pending collaboration requests.' : 'No collaborations found.') 
                      : (activeTab === 'pending' ? 'No unapproved edits found.' : 'You have no approved edits yet.')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCollab && (
          <motion.div
            className={styles.fullModalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.target === e.currentTarget && setSelectedCollab(null)}
          >
            <motion.div
              className={`${styles.fullModal} ${isFullScreen ? styles.fullModalActive : ''}`}
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25 }}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalUser}>
                  <img
                    src={selectedCollab.authorPhoto || `https://i.pravatar.cc/150?u=${selectedCollab.authorId}`}
                    alt={selectedCollab.authorName}
                    loading="lazy"
                  />
                  <div>
                    <h4>{selectedCollab.authorName}</h4>
                    <span>{isQuickEditing ? "Modifying Draft..." : "Proposed edit"} · {selectedCollab.time ? new Date(selectedCollab.time).toLocaleDateString() : ''}</span>
                  </div>
                  {selectedCollab.isApproved && !isQuickEditing && (
                    <div className={styles.approvedBadge}>
                      <CheckCircle2 size={14} /> Published
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)} 
                        className={styles.modalExpand}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
                    >
                        {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>
                    <button onClick={() => setSelectedCollab(null)} className={styles.modalClose}>
                    <X size={20} />
                    </button>
                </div>
              </div>

              <div className={styles.modalBody}>
                {isQuickEditing ? (
                    <div className={styles.quickEditorContainer} style={{ padding: isFullScreen ? '2rem 4rem' : '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>Section Title</label>
                            <input 
                                type="text"
                                className={styles.quickInput}
                                value={editedSubtitle}
                                onChange={e => setEditedSubtitle(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Proposed Lore Content</label>
                                <div className={styles.quickToolbar}>
                                    <button className={`${styles.toolBtn} ${activeStyles.bold ? styles.toolBtnActive : ''}`} onClick={() => execCommand('bold')} title="Bold"><Bold size={16} /></button>
                                    <button className={`${styles.toolBtn} ${activeStyles.italic ? styles.toolBtnActive : ''}`} onClick={() => execCommand('italic')} title="Italic"><Italic size={16} /></button>
                                    <button className={`${styles.toolBtn} ${activeStyles.underline ? styles.toolBtnActive : ''}`} onClick={() => execCommand('underline')} title="Underline"><Underline size={16} /></button>
                                    <button className={`${styles.toolBtn} ${activeStyles.strikeThrough ? styles.toolBtnActive : ''}`} onClick={() => execCommand('strikeThrough')} title="Strikethrough"><Strikethrough size={16} /></button>
                                    <button className={styles.toolBtn} onClick={applyHighlight} title="Highlight"><Highlighter size={16} /></button>
                                </div>
                            </div>
                            
                            <div className={styles.paragraphsEditorArea}>
                                {editedParagraphs.map((para: string, idx: number) => (
                                    <EditableQuickPara 
                                        key={idx}
                                        initialValue={para}
                                        onBlur={(val: string) => updateQuickPara(idx, val)}
                                        onRemove={() => removeQuickPara(idx)}
                                        showRemove={editedParagraphs.length > 1}
                                    />
                                ))}

                                <button onClick={addQuickPara} className={styles.addQuickParaBtn}>
                                    <Plus size={14} />
                                    <span>ADD PARAGRAPH</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                    {(() => {
                        const parent = currentSections.find(s => s.id === selectedCollab.sectionId);
                        if (parent) {
                          return (
                            <div className={styles.reviewSection}>
                              <div className={styles.sectionHeader}>
                                <div className={`${styles.sectionIndicator} ${styles.indicatorOriginal}`} />
                                <label>Current Version</label>
                              </div>
                              <div className={`${styles.reviewCard} ${styles.originalCard}`}>
                                <div className={styles.contentBlock}>
                                  <div className={styles.parentContent}>
                                    {parent.paragraphs.map((p: any, i: number) => {
                                      const html = typeof p === 'string' ? p : (p.text ? structuredToHtml(p) : (p.content || JSON.stringify(p)));
                                      return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
      
                      <div className={styles.reviewSection}>
                        <div className={styles.sectionHeader}>
                          <div className={styles.sectionIndicator} />
                          <label>Proposed Changes</label>
                        </div>
                        <div className={styles.reviewCard}>
                          <div className={styles.proposedTitleBlock}>
                            <span className={styles.fieldLabel}>Section Title</span>
                            <h3 className={styles.proposedTitle}>{selectedCollab.subtitle || 'Untitled'}</h3>
                          </div>
                          <div className={styles.contentBlock}>
                            <span className={styles.fieldLabel}>Proposed Content</span>
                            <div className={styles.proposedContent}>
                              {selectedCollab.paragraph && selectedCollab.paragraph.map((p: any, i: number) => {
                                const html = typeof p === 'string' ? p : (p.text ? structuredToHtml(p) : (p.content || JSON.stringify(p)));
                                return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                )}
              </div>

              <div className={styles.modalFooter}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {!isQuickEditing ? (
                        <>
                        <button 
                            className={styles.deleteBtnRed}
                            onClick={() => handleDelete(selectedCollab.id)}
                            disabled={isDeleting}
                            style={{ background: 'rgba(255, 77, 77, 0.1)', color: '#ff4d4d', border: '1px solid #ff4d4d', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={16} /> Delete</>}
                        </button>
                        {!selectedCollab.isApproved && selectedCollab.authorId === user?.uid && (
                             <button 
                                className={styles.editBtnBox}
                                onClick={() => startQuickEdit(selectedCollab)}
                                style={{ background: 'rgba(254, 182, 12, 0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                <Edit3 size={16} /> Quick Edit
                            </button>
                        )}
                        </>
                    ) : (
                        <button 
                            className={styles.cancelEditBtn}
                            onClick={() => setIsQuickEditing(false)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontWeight: 700, padding: '0 1rem', cursor: 'pointer' }}
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    {isQuickEditing ? (
                         <button
                            className={styles.approveBtn}
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            style={{ minWidth: '160px' }}
                        >
                            {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Update Draft</>}
                        </button>
                    ) : (
                        <>
                        <button className={styles.cancelBtn} onClick={() => setSelectedCollab(null)}>
                        Close
                        </button>
                        {isAuthor && (
                            !selectedCollab.isApproved ? (
                            <button
                                className={styles.approveBtn}
                                onClick={() => handleApprove(selectedCollab.id)}
                                disabled={isApproving}
                            >
                                {isApproving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Approve & Publish</>}
                            </button>
                            ) : (
                            <button
                                className={styles.unapproveBtn}
                                onClick={() => handleUnapprove(selectedCollab.id)}
                                disabled={isUnapproving}
                                style={{ background: '#ff4d4d', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                            >
                                {isUnapproving ? <Loader2 size={16} className="animate-spin" /> : <><X size={16} /> Unapprove</>}
                            </button>
                            )
                        )}
                        </>
                    )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={deleteConfirm.open} onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false })} maxWidth="400px">
          <div style={{ padding: '2rem', background: 'var(--background)', color: 'var(--foreground)', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 77, 77, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Trash2 size={30} color="#ff4d4d" />
              </div>
              <h3 style={{ fontWeight: 800, marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Delete Draft?</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem', lineHeight: 1.6 }}>
                  Are you sure you want to permanently delete this publication draft? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btnOutline" style={{ width: '100%', padding: '0.8rem' }} onClick={() => setDeleteConfirm({ ...deleteConfirm, open: false })}>Cancel</button>
                  <button 
                      className="btnSolid" 
                      style={{ width: '100%', padding: '0.8rem', background: '#ff4d4d', color: '#fff', border: 'none', fontWeight: 900 }} 
                      onClick={confirmDelete}
                  >
                      DELETE DRAFT
                  </button>
              </div>
          </div>
      </Modal>
    </>
  );
}
