'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Eye, Share2, MessageSquare } from 'lucide-react';
import { incrementBlogViews, toggleBlogLikeSimple } from '@/lib/blog-actions';
import { useToast } from '../Toast';
import styles from './blog-interactions.module.css';

interface BlogInteractionsProps {
    blogId: string;
    slug: string;
    initialViews: number;
    initialLikes: number;
}

export default function BlogInteractions({ blogId, slug, initialViews, initialLikes }: BlogInteractionsProps) {
    const { showToast } = useToast();
    const [views, setViews] = useState(initialViews);
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [isLiking, setIsLiking] = useState(false);

    useEffect(() => {
        // Increment views on mount (with browser/localStorage detection to prevent spam on refresh)
        if (blogId) {
            const viewedPosts = JSON.parse(localStorage.getItem('viewed_dispatches') || '[]');
            
            if (!viewedPosts.includes(blogId)) {
                incrementBlogViews(blogId);
                setViews(prev => prev + 1);
                
                // Mark as viewed
                viewedPosts.push(blogId);
                localStorage.setItem('viewed_dispatches', JSON.stringify(viewedPosts));
            }

            // Check if liked from local storage (IP/Browser detection simulation)
            const likedPosts = JSON.parse(localStorage.getItem('liked_dispatches') || '[]');
            if (likedPosts.includes(blogId)) {
                setIsLiked(true);
            }
        }
    }, [blogId]);

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);

        try {
            const nextLikedState = !isLiked;
            const res = await toggleBlogLikeSimple(blogId, nextLikedState);
            
            if (res.success) {
                setIsLiked(nextLikedState);
                setLikes(prev => nextLikedState ? prev + 1 : prev - 1);
                
                // Update local storage
                const likedPosts = JSON.parse(localStorage.getItem('liked_dispatches') || '[]');
                if (nextLikedState) {
                    if (!likedPosts.includes(blogId)) likedPosts.push(blogId);
                } else {
                    const index = likedPosts.indexOf(blogId);
                    if (index > -1) likedPosts.splice(index, 1);
                }
                localStorage.setItem('liked_dispatches', JSON.stringify(likedPosts));
                
                showToast(nextLikedState ? 'Dispatch Endorsed.' : 'Endorsement Withdrawn.', 'success');
            }
        } catch (err) {
            showToast('Transmission failure.', 'error');
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast('Manifest URL copied to clipboard.', 'success');
    };

    return (
        <div className={styles.interactionBar}>
            <div className={styles.statGroup}>
                <div className={styles.statItem}>
                    <Eye size={18} />
                    <span>{views.toLocaleString()}</span>
                </div>
                <button 
                    className={`${styles.statItem} ${isLiked ? styles.liked : ''}`} 
                    onClick={handleLike}
                    disabled={isLiking}
                >
                    <Heart size={18} fill={isLiked ? 'var(--primary)' : 'none'} />
                    <span>{likes.toLocaleString()}</span>
                </button>
            </div>

            <div className={styles.actionGroup}>
                <button className={styles.actionBtn} onClick={handleShare}>
                    <Share2 size={18} />
                </button>
                <button className={styles.actionBtn}>
                    <MessageSquare size={18} />
                </button>
            </div>
        </div>
    );
}
