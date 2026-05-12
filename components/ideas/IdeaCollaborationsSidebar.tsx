'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Eye, User, Loader2, AlertTriangle, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingCollaborations, getAllCollaborations, approveCollaboration, unapproveCollaboration } from '@/lib/idea-actions';
import { structuredToHtml } from '@/lib/text-parser';
import { useToast } from '../Toast';
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
}

export default function IdeaCollaborationsSidebar({
  isOpen,
  onClose,
  ideaId,
  onApproved,
  currentSections,
  isMobile = false
}: IdeaCollaborationsSidebarProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const { showToast } = useToast();

  const loadCollaborations = async (tab: 'pending' | 'all') => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = tab === 'pending'
        ? await getPendingCollaborations(ideaId)
        : await getAllCollaborations(ideaId);
      if (res.success && res.collaborations) {
        setCollaborations(res.collaborations);
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
  }, [isOpen, ideaId, activeTab]);

  const handleApprove = async (id: string) => {
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
    setIsUnapproving(true);
    try {
      const res = await unapproveCollaboration(id);
      if (res.success) {
        showToast('Collaboration unapproved.', 'success');
        // Refresh list
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
                <MessageSquare size={14} /> Collaborations
              </div>
              <div className={styles.headerTitle}>
                <h3>Review <span>Edits</span></h3>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('pending')}
                >
                  Pending
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
              </div>
            </div>

            {/* List */}
            <div className={styles.listArea}>
              {loading ? (
                <div className={styles.loading}>
                  <Loader2 size={24} className="animate-spin" />
                  <p>Loading...</p>
                </div>
              ) : collaborations.length > 0 ? (
                collaborations.map((collab: Collaboration) => (
                  <div key={collab.id} className={styles.collabCard}>
                    <div className={styles.collabHeader}>
                      <div className={styles.userIcon}>
                        {collab.authorPhoto ? (
                          <img src={collab.authorPhoto} alt={collab.authorName} />
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
                      onClick={() => setSelectedCollab(collab)}
                    >
                      <Eye size={14} /> Read Proposed Edit
                    </button>
                  </div>
                ))
              ) : (
                <div className={styles.empty}>
                  <AlertTriangle size={32} opacity={0.2} />
                  <p>
                    {activeTab === 'pending'
                      ? 'No pending collaboration requests.'
                      : 'No collaborations found for this idea.'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Review Modal — rendered outside the sidebar */}
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
              className={styles.fullModal}
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
                  />
                  <div>
                    <h4>{selectedCollab.authorName}</h4>
                    <span>Proposed edit · {selectedCollab.time ? new Date(selectedCollab.time).toLocaleDateString() : ''}</span>
                  </div>
                  {selectedCollab.isApproved && (
                    <div className={styles.approvedBadge}>
                      <CheckCircle2 size={14} /> Approved
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedCollab(null)} className={styles.modalClose}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>

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


              </div>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setSelectedCollab(null)}>
                  Close
                </button>
                {!selectedCollab.isApproved ? (
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(selectedCollab.id)}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <><Check size={16} /> Approve & Publish</>
                    )}
                  </button>
                ) : (
                  <button
                    className={styles.unapproveBtn}
                    onClick={() => handleUnapprove(selectedCollab.id)}
                    disabled={isUnapproving}
                    style={{ background: '#ff4d4d', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isUnapproving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <><X size={16} /> Unapprove Content</>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
