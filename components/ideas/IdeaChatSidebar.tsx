'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, MessageSquare, User, Loader2, Pencil, Heart, Trash2, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { getIdeaComments, upsertIdeaComment, deleteIdeaComment, toggleIdeaCommentLike } from '@/lib/idea-actions';
import styles from './idea-chat-sidebar.module.css';
import { useToast } from '../Toast';
import { useAuth } from '@/lib/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  role?: 'admin' | 'user' | 'mod';
  avatar?: string;
  likes: number;
}

interface IdeaChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  ideaTitle: string;
  ideaId: string;
  isMobile?: boolean;
}

const COMMENTS_PER_PAGE = 10;

export default function IdeaChatSidebar({ isOpen, onClose, ideaTitle, ideaId, isMobile = false }: IdeaChatSidebarProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Load liked comments from local storage
  useEffect(() => {
    if (!ideaId) return;
    const saved = localStorage.getItem(`liked_comments_idea_${ideaId}`);
    if (saved) setLikedCommentIds(JSON.parse(saved));
  }, [ideaId]);

  // Initial Load
  const loadComments = async (pageNum: number, append = false) => {
    if (!ideaId) return;
    setLoading(true);
    try {
      const res = await getIdeaComments(ideaId, pageNum, COMMENTS_PER_PAGE);
      if (res.success && Array.isArray(res.comments)) {
        const mapped: Comment[] = res.comments.map((c: any) => ({
          id: c.userId, 
          sender: c.userName || 'Operative',
          content: c.comment,
          timestamp: c.commenteddatetime 
            ? new Date(c.commenteddatetime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : '...',
          isMe: user?.uid === c.userId, // Changed to uid for ideas
          role: c.role || 'user',
          avatar: c.userAvatar || null,
          likes: c.likes || 0
        }));
        
        setComments(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(res.comments.length === COMMENTS_PER_PAGE);
      } else {
        setHasMore(false);
      }

    } catch (e) {
      console.error("Error loading comments:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ideaId) {
      setPage(1);
      loadComments(1);
    }
  }, [isOpen, ideaId, user]);

  const loadMoreComments = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadComments(nextPage, true);
  };

  const handleEditClick = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setInputValue(content);
    textareaRef.current?.focus();
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !ideaId || !user) return;
    
    setLoading(true);
    try {
      const res = await deleteIdeaComment(ideaId, user.uid);
      if (res.success) {
        showToast('Intelligence entry purged.', 'success');
        setComments(prev => prev.filter(c => c.id !== user.uid));
        setCommentToDelete(null);
      }
    } catch (error) {
      showToast('Purge failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentUserId: string) => {
    if (!ideaId) return;

    const isAlreadyLiked = likedCommentIds.includes(commentUserId);
    const nextLikedIds = isAlreadyLiked
      ? likedCommentIds.filter(id => id !== commentUserId)
      : [...likedCommentIds, commentUserId];

    setLikedCommentIds(nextLikedIds);
    localStorage.setItem(`liked_comments_idea_${ideaId}`, JSON.stringify(nextLikedIds));

    try {
      await toggleIdeaCommentLike(ideaId, commentUserId, !isAlreadyLiked);
      setComments(prev => prev.map(c => 
        c.id === commentUserId ? { ...c, likes: c.likes + (isAlreadyLiked ? -1 : 1) } : c
      ));
    } catch (error) {
      console.error('Error updating likes:', error);
    }
  };

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSubmitting) return;

    if (!user) {
      showToast('Authentication required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        comment: inputValue.trim(),
        userName: user.displayName || 'Anonymous User',
        userAvatar: user.photoURL || null,
        role: 'user'
      };

      const res = await upsertIdeaComment(ideaId, user.uid, payload);
      if (res.success) {
        setInputValue('');
        setEditingCommentId(null);
        showToast('Intelligence updated.', 'success');
        loadComments(1); // Refresh
      }
    } catch (error) {
      showToast('Transmission failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      loadMoreComments();
    }
  };

  return (
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
          <div className={styles.header}>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={24} />
            </button>
            <div className={styles.badge}>
              <MessageSquare size={14} /> Intelligence Archive
            </div>
            <div className={styles.headerTitle}>
              <h3>Idea <span>Comments</span></h3>
            </div>
          </div>

          <div className={styles.chatArea} ref={scrollRef} onScroll={handleScroll}>
            {comments.map((msg) => (
              <div key={msg.id} className={styles.message}>
                <div className={styles.avatarContainer}>
                  {msg.avatar ? (
                    <img src={msg.avatar} alt={msg.sender} className={styles.avatar} />
                  ) : (
                    <User size={12} color="#000" />
                  )}
                </div>
                
                <div className={styles.messageContent}>
                  <div className={styles.messageMeta}>
                    <span className={styles.senderName}>{msg.sender}</span>
                    {msg.isMe && <span className={styles.youBadge}>(YOU)</span>}
                    <span className={styles.timestamp}>{msg.timestamp}</span>
                    {msg.role === 'admin' && <ShieldAlert size={10} style={{ color: 'var(--primary)' }} />}
                  </div>
                  
                  <div className={styles.messageBubble}>
                    {msg.content}
                  </div>

                  <div className={styles.messageActions}>
                    <button 
                      className={`${styles.likeBtn} ${likedCommentIds.includes(msg.id) ? styles.liked : ''}`}
                      onClick={() => handleLikeComment(msg.id)}
                    >
                      <Heart size={12} fill={likedCommentIds.includes(msg.id) ? 'currentColor' : 'none'} />
                      <span>{msg.likes || 0}</span>
                    </button>

                    {msg.isMe && (
                      <div className={styles.ownerActions}>
                        <button 
                          className={styles.editBtn} 
                          onClick={() => handleEditClick(msg.id, msg.content)}
                          title="Edit Entry"
                        >
                          <Pencil size={12} />
                        </button>
                        <button 
                          className={styles.deleteBtn} 
                          onClick={() => setCommentToDelete(msg.id)}
                          title="Purge Entry"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading ? (
              <div className={styles.loadingIndicator}>
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : (
              hasMore && comments.length > 0 && (
                <button className={styles.loadMoreBtn} onClick={loadMoreComments}>
                  Load Older Comments
                </button>
              )
            )}

            {comments.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 italic text-xs py-20">
                <p>No recorded data in this sector.</p>
              </div>
            )}
          </div>

          <div className={styles.inputArea}>
            <div className={styles.inputHint}>
              <CornerDownLeft size={10} />
              <span>{isMobile ? 'Update to broadcast' : 'ENTER to Update • SHIFT+ENTER for new line'}</span>
            </div>
            <form onSubmit={handleSubmitComment} className={styles.inputWrapper}>
              <textarea 
                ref={textareaRef}
                placeholder={user ? "Broadcast intelligence..." : "Authentication required"} 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || !user}
                maxLength={1000}
              />
              <div className={styles.inputFooter}>
                <button 
                  type="submit" 
                  className={styles.sendBtn} 
                  disabled={isSubmitting || !inputValue.trim() || !user}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Update</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {commentToDelete && (
            <div className={styles.modalOverlay}>
              <div className={styles.alertModal}>
                <div className={styles.alertHeader}>
                  <AlertTriangle size={24} color="var(--primary)" />
                  <h3>Purge Confirmation</h3>
                </div>
                <p>Are you sure you want to permanently delete this intelligence entry from the archive? This action cannot be undone.</p>
                <div className={styles.alertFooter}>
                  <button 
                    className={styles.cancelBtn} 
                    onClick={() => setCommentToDelete(null)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.confirmDeleteBtn} 
                    onClick={handleDeleteComment}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Purge'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
