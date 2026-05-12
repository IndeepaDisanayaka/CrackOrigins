import React from 'react';
import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getGames } from '@/lib/admin-actions';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Play, Download, Star, Filter, Search } from 'lucide-react';
import styles from './GamesPage.module.css';

export const metadata: Metadata = {
    title: 'All Creations | Crack Origins',
    description: 'Explore the full library of indie games, lore explorations, and gaming chronicles developed by Crack Origins.',
};

export default async function GamesPage() {
    const res = await getGames();
    let games = (res.success && res.games) ? res.games : [];

    // Sort games by last released (listed date)
    games.sort((a, b) => {
        const dateA = new Date(a.listed || 0).getTime();
        const dateB = new Date(b.listed || 0).getTime();
        return dateB - dateA;
    });

    return (
        <div className={styles.container}>
            <Header />
            <div className={styles.backgroundAnimation}></div>
            
            <main className={styles.main}>
                <div className={styles.contentWrapper}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>Creations</h1>
                        <p className={styles.pageSubtitle}>Explore our latest deployments and digital worlds.</p>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.stats}>
                            <span className={styles.statValue}>{games.length}</span>
                            <span className={styles.statLabel}>Deployments Found</span>
                        </div>
                        
                        <div className={styles.searchBox}>
                            <Search size={18} className={styles.searchIcon} />
                            <input type="text" placeholder="Search creations..." className={styles.searchInput} />
                        </div>
                    </div>

                    <div className={styles.gamesGrid}>
                        {games.length > 0 ? (
                            games.map((game) => (
                                <Link key={game.id} href={`/games/${game.slug}`} className={styles.gameCard}>
                                    <div className={styles.imageWrapper}>
                                        <Image 
                                            src={game.image || '/placeholder-game.png'} 
                                            alt={game.title} 
                                            fill 
                                            style={{ objectFit: 'cover' }}
                                            className={styles.gameImage}
                                        />
                                        <div className={styles.cardOverlay}>
                                            <div className={styles.playIcon}><Play size={24} fill="currentColor" /></div>
                                        </div>
                                        <div className={styles.priceBadge}>{game.price === 0 || game.price === 'Free' ? 'FREE' : game.price}</div>
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
                                            {game.description.length > 100 
                                                ? `${game.description.substring(0, 100)}...` 
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
                            ))
                        ) : (
                            <div className={styles.emptyState}>
                                <Download size={48} />
                                <h3>No deployments detected</h3>
                                <p>We're currently refactoring our database. Please check back later.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
