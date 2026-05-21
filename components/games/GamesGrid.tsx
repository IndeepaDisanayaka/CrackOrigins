'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Star, ChevronRight, Search, Shield, Globe, Download } from 'lucide-react';
import styles from '@/app/games/GamesPage.module.css';
import Input from '../ui/Input';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1, 
        y: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 100,
            damping: 20
        }
    }
};

export default function GamesGrid({ initialGames }: { initialGames: any[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    
    const filteredGames = initialGames.filter(game => 
        game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.genre.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.contentWrapper}>
            <div className={styles.pageHeader}>
                <div className={styles.headerGrid}>
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className={styles.gridLine} />
                    ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', gap: '2rem', flexWrap: 'wrap',margin:10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span className="sectionLabel">Central Deployment Hub</span>
                        <motion.h1 
                            className={styles.pageTitle}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            Deployments & <span>Creations</span>
                        </motion.h1>
                        <motion.p 
                            className={styles.pageSubtitle}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        >
                            The epicenter of Crack Origins digital architecture and immersive worlds.
                        </motion.p>
                    </div>

                    <div style={{ minWidth: '320px', marginBottom: '1rem' }}>
                         <Input 
                            placeholder="Scan deployments..." 
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            icon={<Search size={14} />}
                            label="Security Verification"
                         />
                    </div>
                </div>
            </div>

            <motion.div 
                className={styles.gamesGrid}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={searchQuery} // Re-animate on filter
            >
                {filteredGames.length > 0 ? (
                    filteredGames.map((game) => (
                        <motion.div key={game.id} variants={itemVariants}>
                            <Link href={`/games/${game.slug}`} className={styles.gameCard}>
                                <div className={styles.imageWrapper}>
                                    <Image 
                                        src={game.image || '/placeholder-game.png'} 
                                        alt={game.title} 
                                        fill 
                                        style={{ objectFit: 'cover' }}
                                        className={styles.gameImage}
                                    />
                                    <div className={styles.cardOverlay}>
                                        <div className={styles.playBtn}>
                                            <Play size={16} fill="currentColor" /> Initialize Access
                                        </div>
                                    </div>
                                    <div className={styles.priceBadge}>
                                        {game.price === 0 || game.price === 'Free' ? 'Public Access' : game.price}
                                    </div>
                                </div>
                                
                                <div className={styles.cardBody}>
                                    <div className={styles.cardMeta}>
                                        <span className={styles.genre}>{game.genre.split('&')[0]}</span>
                                        <div className={styles.rating}>
                                            <Star size={12} fill="var(--primary)" color="var(--primary)" />
                                            <span>4.9</span>
                                        </div>
                                    </div>
                                    <h3 className={styles.gameTitle}>{game.title}</h3>
                                    <p className={styles.gameDesc}>
                                        {game.description.length > 120 
                                            ? `${game.description.substring(0, 120)}...` 
                                            : game.description}
                                    </p>
                                    <div className={styles.cardFooter}>
                                        <span className={styles.osText}>{game.os}</span>
                                        <div className={styles.actionLink}>
                                            View Intelligence <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>
                    ))
                ) : (
                    <motion.div className={styles.emptyState} variants={itemVariants}>
                        <div style={{ background: 'rgba(var(--primary-rgb), 0.1)', padding: '2rem', borderRadius: '50%' }}>
                            <Download size={48} className="text-primary" />
                        </div>
                        <h3>No deployments detected</h3>
                        <p>The central hub is undergoing synchronization. Please stand by for incoming data.</p>
                        <button className="btnSolid" style={{ marginTop: '1rem' }} onClick={() => setSearchQuery('')}>Clear Filter scan</button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
