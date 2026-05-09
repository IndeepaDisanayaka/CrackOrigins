import React from 'react';
import { Metadata } from 'next';
import { getGameBySlug } from '@/lib/admin-actions';
import GameViewClient from './GameViewClient';
import { notFound } from 'next/navigation';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const res = await getGameBySlug(slug);
    
    if (!res.success || !res.game) {
        return {
            title: 'Game Not Found | Crack Origins',
            description: 'The requested game could not be found on Crack Origins.'
        };
    }

    const game: any = res.game;
    const title = `${game.title} | Crack Origins Official Page`;
    const description = game.description || `Play ${game.title} on Crack Origins. Explore game details, updates, and reviews.`;

    return {
        title,
        description,
        keywords: [
            game.title, 
            'Crack Origins', 
            'CrackOrigins Game', 
            'PC Game Download', 
            'Secure Gaming', 
            'Indie Game Hub',
            ...(game.genre ? (Array.isArray(game.genre) ? game.genre : [game.genre]) : [])
        ],
        alternates: {
            canonical: `/games/${game.slug}`
        },
        openGraph: {
            title,
            description,
            images: [
                {
                    url: game.image || game.logo || '/og-image.png',
                    width: 1200,
                    height: 630,
                    alt: `${game.title} - Official Creation at Crack Origins`
                }
            ],
            type: 'website',
            siteName: 'Crack Origins'
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [game.image || game.logo || '/og-image.png']
        }
    };
}

export default async function GamePage({ params }: Props) {
    const { slug } = await params;
    console.log(`[GamePage] Loading page for slug: ${slug}`);
    const res = await getGameBySlug(slug);
    console.log(`[GamePage] getGameBySlug result: success=${res.success}`);

    if (!res.success || !res.game) {
        console.log(`[GamePage] Game not found or error, triggering notFound()`);
        notFound();
    }

    return (
        <GameViewClient 
            game={res.game} 
            updates={res.updates || []} 
            reviews={res.reviews || []} 
        />
    );
}
