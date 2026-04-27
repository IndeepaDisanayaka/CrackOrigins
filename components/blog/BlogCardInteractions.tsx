'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, SendHorizontal, MessageCircle, Share2 } from 'lucide-react';
import { useModals } from '@/lib/contexts/ModalContext';
import { useToast } from '../Toast';
import styles from './blog-card-interactions.module.css';

interface BlogCardInteractionsProps {
  blogId: string;
  slug: string;
  title: string;
}

export default function BlogCardInteractions({ blogId, slug, title }: BlogCardInteractionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isBlogChatOpen, 
    setIsBlogChatOpen, 
    setSelectedBlogTitle, 
    setSelectedBlogId,
    selectedBlogId: currentBlogId
  } = useModals();
  const { showToast } = useToast();

  const handleOpenChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isDetailPage = pathname === `/blog/${slug}`;

    if (isDetailPage) {
      if (isBlogChatOpen && currentBlogId === blogId) {
        setIsBlogChatOpen(false);
      } else {
        setSelectedBlogTitle(title);
        setSelectedBlogId(blogId);
        setIsBlogChatOpen(true);
      }
    } else {
      // Navigate to detail page with auto-chat flag
      router.push(`/blog/${slug}?chat=true`);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard.', 'success');
  };

  return (
    <div className={styles.socialIcons}>
      <button className={styles.iconBtn} onClick={handleOpenChat} title="Join Transmission">
        <MessageSquare size={16} />
      </button>
      <button className={styles.iconBtn} onClick={handleShare} title="Sync URL">
        <Share2 size={16} />
      </button>
    </div>
  );
}
