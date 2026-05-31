import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');

        // Fetch top 100 players by XP
        const leaderboard = await accountsCol.find(
            { 
                xp: { $gt: 0 }, // Only show users with at least some XP
                isGuestEmail: { $ne: true }, // Optional: Exclude temporary guest accounts if desired
                isTestAccount: { $ne: true } // EXCLUDE TEST ACCOUNTS FROM PUBLIC VIEW
            },
            {
                projection: {
                    name: 1,
                    photoURL: 1,
                    xp: 1,
                    _id: 0 // Explicitly exclude ID to avoid leaking internal identifiers
                }
            }
        )
        .sort({ xp: -1 })
        .limit(100)
        .toArray();

        return NextResponse.json({
            success: true,
            count: leaderboard.length,
            leaderboard: leaderboard
        });

    } catch (error: any) {
        console.error('Leaderboard Fetch Error:', error);
        return NextResponse.json({
            success: false,
            error: 'An internal error occurred while fetching the leaderboard.'
        }, { status: 500 });
    }
}
