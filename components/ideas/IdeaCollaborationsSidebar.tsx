'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Eye, User, Loader2, AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import { getPendingCollaborations, approveCollaboration } from '@/lib/idea-actions';
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
}

interface IdeaCollaborationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ideaId: string;
  onApproved?: () => void;
  currentSections: any[];
}

export default function IdeaCollaborationsSidebar({ 
  isOpen, 
  onClose, 
  ideaId, 
  onApproved,
  currentSections
}: IdeaCollaborationsSidebarProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState<Collaboration | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const { showToast } = useToast();

  const loadCollaborations = async () => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = await getPendingCollaborations(ideaId);
      if (res.success && res.collaborations) {
        setCollaborations(res.collaborations);
      }
    } catch (e) {
      console.error("Error loading collaborations:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ideaId) {
      loadCollaborations();
    }
  }, [isOpen, ideaId]);

  const handleApprove = async (id: string) => {
    setIsApproving(true);
    try {
      const res = await approveCollaboration(id);
      if (res.success) {
        showToast('Collaboration approved and published.', 'success');
        setCollaborations(prev => prev.filter(c => c.id !== id));
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

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
          <div className={styles.badge}>
            <MessageSquare size={14} /> Pending Edits
          </div>
          <div className={styles.headerTitle}>
            <h3>Review <span>Collaborations</span></h3>
          </div>
        </div>

        <div className={styles.listArea}>
          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={24} className="animate-spin" />
              <p>Scanning for submissions...</p>
            </div>
          ) : collaborations.length > 0 ? (
            collaborations.map((collab) => (
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
                      {new Date(collab.time).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className={styles.collabTitle}>
                  Proposed: {collab.subtitle}
                </div>
                <div className={styles.collabActions}>
                  <button 
                    className={styles.readBtn} 
                    onClick={() => setSelectedCollab(collab)}
                  >
                    <Eye size={14} /> Read Proposed Edit
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.empty}>
              <AlertTriangle size={32} opacity={0.2} />
              <p>No pending collaboration requests found for this idea.</p>
            </div>
          )}
        </div>

        {selectedCollab && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <div className={styles.modalUser}>
                  <img src={selectedCollab.authorPhoto || `https://i.pravatar.cc/150?u=${selectedCollab.authorId}`} alt="" />
                  <div>
                    <h4>{selectedCollab.authorName}</h4>
                    <span>Wants to update a section</span>
                  </div>
                </div>
                <button onClick={() => setSelectedCollab(null)} className={styles.modalClose}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.diffBlock}>
                  <label>Section Title</label>
                  <p className={styles.proposedTitle}>{selectedCollab.subtitle}</p>
                </div>

                <div className={styles.diffBlock}>
                  <label>Proposed Content</label>
                  <div className={styles.proposedContent}>
                    {selectedCollab.paragraph.map((p, i) => (
                      <p key={i}>{typeof p === 'string' ? p : p.content}</p>
                    ))}
                  </div>
                </div>

                {(() => {
                  const parent = currentSections.find(s => s.id === selectedCollab.sectionId);
                  if (parent) {
                    return (
                      <div className={styles.diffBlock}>
                        <label>Current Version (To be Replaced)</label>
                        <div className={styles.parentContent}>
                          {parent.paragraphs.map((p: any, i: number) => (
                            <p key={i}>{typeof p === 'string' ? p : p.content}</p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className={styles.modalFooter}>
                <button 
                  className={styles.cancelBtn} 
                  onClick={() => setSelectedCollab(null)}
                >
                  Close
                </button>
                <button 
                  className={styles.approveBtn}
                  onClick={() => handleApprove(selectedCollab.id)}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} /> Approve & Publish
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
