'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, MessageSquare, User, Loader2, Pencil, Heart, Trash2, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { getBlogComments, upsertBlogComment, deleteBlogComment, toggleCommentLike } from '@/lib/blog-actions';
import styles from './blog-chat-sidebar.module.css';
import { useToast } from '../Toast';
import { useAuth } from '@/lib/contexts/AuthContext';

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

interface BlogChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  blogTitle: string;
  blogId: string;
}

const COMMENTS_PER_PAGE = 10;

export default function BlogChatSidebar({ isOpen, onClose, blogTitle, blogId }: BlogChatSidebarProps) {
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
  const [isMobile, setIsMobile] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load liked comments from local storage (or could be moved to DB later)
  useEffect(() => {
    if (!blogId) return;
    const saved = localStorage.getItem(`liked_comments_${blogId}`);
    if (saved) setLikedCommentIds(JSON.parse(saved));
  }, [blogId]);

  // Initial Load
  const loadComments = async (pageNum: number, append = false) => {
    if (!blogId) return;
    setLoading(true);
    try {
      const res = await getBlogComments(blogId, pageNum, COMMENTS_PER_PAGE);
      if (res.success && Array.isArray(res.comments)) {
        const mapped: Comment[] = res.comments.map((c: any) => ({
          id: c.userId, // Using userId as id for existing logic
          sender: c.userName || 'Operative',
          content: c.comment,
          timestamp: c.commenteddatetime 
            ? new Date(c.commenteddatetime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : '...',
          isMe: user?.id === c.userId,
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
    if (isOpen && blogId) {
      setPage(1);
      loadComments(1);
    }
  }, [isOpen, blogId, user]);

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
    if (!commentToDelete || !blogId || !user) return;
    
    setLoading(true);
    try {
      const res = await deleteBlogComment(blogId, user.id);
      if (res.success) {
        showToast('Intelligence entry purged.', 'success');
        setComments(prev => prev.filter(c => c.id !== user.id));
        setCommentToDelete(null);
      }
    } catch (error) {
      showToast('Purge failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentUserId: string) => {
    if (!blogId) return;

    const isAlreadyLiked = likedCommentIds.includes(commentUserId);
    const nextLikedIds = isAlreadyLiked
      ? likedCommentIds.filter(id => id !== commentUserId)
      : [...likedCommentIds, commentUserId];

    setLikedCommentIds(nextLikedIds);
    localStorage.setItem(`liked_comments_${blogId}`, JSON.stringify(nextLikedIds));

    try {
      await toggleCommentLike(blogId, commentUserId, !isAlreadyLiked);
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
        userName: user.name || 'Anonymous User',
        userAvatar: user.image || null,
        role: 'user'
      };

      const res = await upsertBlogComment(blogId, user.id, payload);
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
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        <div className={styles.badge}>
          <MessageSquare size={14} /> Intelligence Archive
        </div>
        <div className={styles.headerTitle}>
          <h3>Blog <span>Comments</span></h3>
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
    </div>
  );
}

