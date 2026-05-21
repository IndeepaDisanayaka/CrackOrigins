import React, { Suspense } from 'react';
import { Metadata } from 'next';
import Footer from '@/components/layout/Footer';
import { getGames } from '@/lib/admin-actions';
import styles from './GamesPage.module.css';
import GamesPageClient from './GamesPageClient';
import GamesGrid from '@/components/games/GamesGrid';

export const metadata: Metadata = {
    title: 'Central Deployment Hub | Crack Origins',
    description: 'Explore the full library of indie games, lore explorations, and gaming chronicles developed by Crack Origins.',
};

export default async function GamesPage() {
    const res = await getGames();
    let games = (res.success && res.games) ? res.games : [];

    games.sort((a, b) => {
        const dateA = new Date(a.listed || 0).getTime();
        const dateB = new Date(b.listed || 0).getTime();
        return dateB - dateA;
    });

    return (
        <div className={styles.container}>
            <Suspense fallback={<div className="h-20 bg-black/20 animate-pulse" />}>
                <GamesPageClient />
            </Suspense>
            <div className={styles.backgroundAnimation}></div>
            
            <main className={styles.main}>
                <GamesGrid initialGames={games} />
            </main>

            <Footer />
        </div>
    );
}
