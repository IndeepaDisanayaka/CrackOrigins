'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Eye, Heart, Bookmark, Share2 } from 'lucide-react';
import styles from './ideaDetails.module.css';
import MobileNav from '@/components/layout/MobileNav';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Dummy data generator based on ID
const getIdeaData = (id: string) => {
  return {
    id,
    title: id.replace(/-/g, ' ').toUpperCase() || 'THE FALL OF NEO-TOKYO',
    category: 'LORE EXPLORATION',
    author: {
      name: 'Alex Dev',
      avatar: 'https://i.pravatar.cc/150?u=alex',
      role: 'Lead Writer'
    },
    collaborators: [
      { name: 'Sarah C.', avatar: 'https://i.pravatar.cc/150?u=sarah' },
      { name: 'John W.', avatar: 'https://i.pravatar.cc/150?u=john' },
      { name: 'Elena R.', avatar: 'https://i.pravatar.cc/150?u=elena' }
    ],
    date: 'May 4, 2026',
    readTime: '12 min read',
    views: '4.5K',
    likes: 892,
    saves: 145,
    image: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070',
    content: `
      <p>In the year 2142, Neo-Tokyo stands as the last bastion of human innovation. The sky above the port is the color of television, tuned to a dead channel. But beneath the neon-drenched streets, a different kind of life flourishes.</p>
      
      <h2>The Rise of the Syntax Cartel</h2>
      <p>The factions fighting for control aren't armed with traditional weapons. They are armed with code. The Syntax Cartel, a rogue group of former megacorp developers, discovered a backdoor in the city's central AI nexus.</p>
      
      <blockquote>
        "We didn't hack the system to break it. We hacked the system to remind them that it can be broken." — Unknown Cartel Operative
      </blockquote>
      
      <p>This single vulnerability allowed them to manipulate traffic patterns, alter financial ledgers, and even change the very advertisements that bombarded citizens daily. The megacorps, entirely dependent on the nexus, were paralyzed.</p>
      
      <h2>Developing the Gameplay Mechanics</h2>
      <p>When translating this lore into gameplay for <em>Cyber-Ascent</em>, we knew we had to make "hacking" feel less like a minigame and more like an environmental weapon. Players will need to use their cyber-deck to alter the environment in real-time to escape corporate enforcers.</p>
      
      <p>Our team spent three months just perfecting the UI for the cyber-deck to ensure it felt diegetic and urgent.</p>
    `
  };
};

export default function IdeaDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const data = getIdeaData(id || 'default');

  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <Header 
        isMobileMenuOpen={isMobileMenuOpen} 
        setIsMobileMenuOpen={setIsMobileMenuOpen} 
      />
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        setIsOpen={setIsMobileMenuOpen} 
      />
      <main className={styles.ideaWrapper}>
        <div className={styles.topNav}>
          <Link href="/ideas" className={styles.backBtn}>
            <ArrowLeft size={16} /> Back to Library
          </Link>
        </div>

        <header className={styles.header}>
          <div className={styles.meta}>
            <span className={styles.category}>{data.category}</span>
            <span>•</span>
            <span>{data.date}</span>
            <span>•</span>
            <span>{data.readTime}</span>
          </div>

          <h1 className={styles.title}>{data.title}</h1>

          <div className={styles.authorRow}>
            <div className={styles.authors}>
              <div className={styles.authorBlock}>
                <img src={data.author.avatar} alt={data.author.name} className={styles.avatar} />
                <div className={styles.authorDetails}>
                  <span className={styles.authorLabel}>Author</span>
                  <span className={styles.authorName}>{data.author.name}</span>
                </div>
              </div>

              <div className={styles.authorBlock}>
                <div className={styles.collabStack}>
                  {data.collaborators.map((collab, index) => (
                    <img 
                      key={index}
                      src={collab.avatar} 
                      alt={collab.name} 
                      className={styles.collabAvatar} 
                      title={collab.name}
                    />
                  ))}
                </div>
                <div className={styles.authorDetails} style={{ marginLeft: '8px' }}>
                  <span className={styles.authorLabel}>Collaborators</span>
                  <span className={styles.authorName}>{data.collaborators.length} Contributors</span>
                </div>
              </div>
            </div>

            <div className={styles.interactions}>
              <button className={styles.statBtn} title="Views">
                <Eye size={18} /> {data.views}
              </button>
              <button 
                className={`${styles.statBtn} ${isLiked ? styles.statBtnActive : ''}`} 
                onClick={() => setIsLiked(!isLiked)}
                title="Like"
              >
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} /> 
                {data.likes + (isLiked ? 1 : 0)}
              </button>
              <button 
                className={`${styles.statBtn} ${isSaved ? styles.statBtnActive : ''}`} 
                onClick={() => setIsSaved(!isSaved)}
                title="Save"
              >
                <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} /> 
                {data.saves + (isSaved ? 1 : 0)}
              </button>
              <button className={styles.statBtn} title="Share">
                <Share2 size={18} /> Share
              </button>
            </div>
          </div>
        </header>

        <div className={styles.coverImage}>
          <img src={data.image} alt="Cover" />
        </div>

        <article 
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: data.content }}
        />

      </main>
      <Footer />
    </>
  );
}
