'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ShieldAlert, MessageSquare, User, Loader2, Pencil, Heart, Trash2, AlertTriangle, CornerDownLeft } from 'lucide-react';
import { fireStore, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  updateDoc,
  increment,
  deleteDoc,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import styles from './blog-chat-sidebar.module.css';
import { useToast } from '../Toast';

interface Comment {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  role?: 'admin' | 'user' | 'mod';
  avatar?: string;
  likes: number;
  commenteddatetime?: Timestamp;
}

interface BlogChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  blogTitle: string;
  blogId: string;
}

const COMMENTS_PER_PAGE = 10;

export default function BlogChatSidebar({ isOpen, onClose, blogTitle, blogId }: BlogChatSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [likedCommentIds, setLikedCommentIds] = useState<string[]>([]);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load liked comments — single doc read from accounts/{uid}/blogs/{blogId} for auth users
  useEffect(() => {
    if (!blogId) return;
    const user = auth.currentUser;

    if (user) {
      const fetchLiked = async () => {
        try {
          // accounts/{userId}/blogs/{blogId} is already allowed by existing rules
          const likeDocRef = doc(fireStore, 'accounts', user.uid, 'blogs', blogId);
          const likeSnap = await getDoc(likeDocRef);
          if (likeSnap.exists()) {
            setLikedCommentIds(likeSnap.data()?.likedCommentIds || []);
          }
        } catch (e) {
          console.error('Error fetching liked comments:', e);
        }
      };
      fetchLiked();
    } else {
      // Guest fallback: per-blog localStorage key
      const saved = localStorage.getItem(`liked_comments_${blogId}`);
      if (saved) setLikedCommentIds(JSON.parse(saved));
    }
  }, [blogId]);

  // Initial Load
  useEffect(() => {
    if (!isOpen || !blogId) return;
    
    setLoading(true);
    const commentsRef = collection(fireStore, 'blogs', blogId, 'comments');
    const q = query(commentsRef, orderBy('commenteddatetime', 'desc'), limit(COMMENTS_PER_PAGE));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const isMe = auth.currentUser?.uid === userId;
        
        return {
          id: userId,
          sender: data.userName || 'Operative',
          content: data.comment,
          timestamp: data.commenteddatetime 
            ? new Date(data.commenteddatetime.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : '...',
          isMe,
          role: data.role || 'user',
          avatar: data.userAvatar || null,
          likes: data.likes || 0,
          commenteddatetime: data.commenteddatetime
        } as Comment;
      });
      
      setComments(loadedComments);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === COMMENTS_PER_PAGE);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, blogId]);

  const loadMoreComments = async () => {
    if (!hasMore || loading || !lastDoc || !blogId) return;

    setLoading(true);
    try {
      const commentsRef = collection(fireStore, 'blogs', blogId, 'comments');
      const q = query(
        commentsRef, 
        orderBy('commenteddatetime', 'desc'), 
        startAfter(lastDoc), 
        limit(COMMENTS_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      const moreComments = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const isMe = auth.currentUser?.uid === userId;
        
        return {
          id: userId,
          sender: data.userName || 'Operative',
          content: data.comment,
          timestamp: data.commenteddatetime 
            ? new Date(data.commenteddatetime.seconds * 1000).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
            : '...',
          isMe,
          role: data.role || 'user',
          avatar: data.userAvatar || null,
          likes: data.likes || 0,
          commenteddatetime: data.commenteddatetime
        } as Comment;
      });

      setComments(prev => [...prev, ...moreComments]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === COMMENTS_PER_PAGE);
    } catch (error) {
      console.error("Error loading more comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setInputValue(content);
    textareaRef.current?.focus();
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !blogId) return;
    
    setLoading(true);
    try {
      const commentDocRef = doc(fireStore, 'blogs', blogId, 'comments', commentToDelete);
      await deleteDoc(commentDocRef);
      showToast('Intelligence entry purged.', 'success');
      setCommentToDelete(null);
    } catch (error) {
      console.error("Error deleting comment:", error);
      showToast('Purge failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!blogId) return;

    const user = auth.currentUser;
    const isAlreadyLiked = likedCommentIds.includes(commentId);
    const nextLikedIds = isAlreadyLiked
      ? likedCommentIds.filter(id => id !== commentId)
      : [...likedCommentIds, commentId];

    // Optimistic UI update
    setLikedCommentIds(nextLikedIds);

    try {
      if (user) {
        // Authenticated: store liked IDs in accounts/{uid}/blogs/{blogId}
        // This path is already covered by existing Firestore rules
        const likeDocRef = doc(fireStore, 'accounts', user.uid, 'blogs', blogId);
        await setDoc(likeDocRef, {
          likedCommentIds: isAlreadyLiked ? arrayRemove(commentId) : arrayUnion(commentId)
        }, { merge: true });
      } else {
        // Guest: per-blog localStorage key
        localStorage.setItem(`liked_comments_${blogId}`, JSON.stringify(nextLikedIds));
      }

      // Update aggregate likes count on the comment document
      const commentDocRef = doc(fireStore, 'blogs', blogId, 'comments', commentId);
      await updateDoc(commentDocRef, {
        likes: increment(isAlreadyLiked ? -1 : 1)
      });
    } catch (error) {
      console.error('Error updating likes:', error);
      // Revert optimistic update on failure
      setLikedCommentIds(likedCommentIds);
    }
  };

  const handleSubmitComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSubmitting) return;

    if (!auth.currentUser) {
      showToast('Authentication required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const userId = auth.currentUser.uid;
      const commentDocRef = doc(fireStore, 'blogs', blogId, 'comments', userId);
      
      const payload: any = {
        comment: inputValue.trim(),
        lastUpdated: serverTimestamp(),
      };

      if (!editingCommentId) {
        payload.commenteddatetime = serverTimestamp();
        payload.userName = auth.currentUser.displayName || 'Anonymous User';
        payload.userEmail = auth.currentUser.email;
        payload.userAvatar = auth.currentUser.photoURL || null;
        payload.role = 'user';
        payload.likes = 0;
      }

      await setDoc(commentDocRef, payload, { merge: true });

      setInputValue('');
      setEditingCommentId(null);
      showToast('Intelligence updated.', 'success');
    } catch (error) {
      console.error("Error submitting comment:", error);
      showToast('Transmission failure.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // On Desktop: Enter = Submit, Shift+Enter = New Line
    // On Mobile: Enter = New Line always (handled by default behavior)
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
            placeholder={auth.currentUser ? "Broadcast intelligence..." : "Authentication required"} 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting || !auth.currentUser}
            maxLength={1000}
          />
          <div className={styles.inputFooter}>
            <button 
              type="submit" 
              className={styles.sendBtn} 
              disabled={isSubmitting || !inputValue.trim() || !auth.currentUser}
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

      {/* Custom Alert Modal for Delete Confirmation */}
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
