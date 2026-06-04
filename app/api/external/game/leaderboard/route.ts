import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const productCode = searchParams.get('productCode');

        if (!productCode) {
            return NextResponse.json({ 
                success: false, 
                error: 'Product code is required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        const leaderboard = await db.collection('game_activities').aggregate([
            { $match: { productCode: productCode } }, // Filter by game
            { $sort: { earnedXp: -1, timestamp: -1 } }, // Get highest XP records first
            {
                $group: {
                    _id: "$accountId",
                    maxEarnedXp: { $first: "$earnedXp" },
                    level: { $first: "$level" },
                    playTime: { $first: "$playTime" },
                    timestamp: { $first: "$timestamp" }
                }
            },
            {
                $lookup: {
                    from: "accounts",
                    let: { actAccountId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $eq: [{ $toString: "$_id" }, "$$actAccountId"] },
                                        { $eq: ["$uid", "$$actAccountId"] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $match: {
                    "user.isTestAccount": { $ne: true }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: ["$user.name", { $ifNull: ["$user.displayName", "Guest Operative"] }] },
                    photoURL: "$user.photoURL",
                    xp: "$maxEarnedXp",
                    level: { $ifNull: ["$level", 0] },
                    playTime: { $ifNull: ["$playTime", 0] },
                    storedTime: "$timestamp"
                }
            },
            { $sort: { xp: -1 } },
            { $limit: 1000 }
        ]).toArray();

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
