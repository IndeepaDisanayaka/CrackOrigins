import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');
        const productCode = searchParams.get('productCode');

        if (!uid) {
            return NextResponse.json({ 
                success: false, 
                error: 'User ID is required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();
        
        // Filter by productCode if provided
        const query: any = { referredBy: uid };
        if (productCode) {
            query.productCode = productCode;
        }

        // Load all affiliates for this user
        const affiliates = await db.collection('game_affiliates')
            .find(query)
            .sort({ date: -1 })
            .toArray();

        if (affiliates.length === 0) {
            return NextResponse.json({
                success: true,
                affiliates: []
            });
        }

        // ONLY fetch from 'accounts' if data is missing in 'game_affiliates'
        const uidsToFetch = affiliates
            .filter(a => !a.name || !a.photoURL)
            .map(a => a.referredUid);

        let userMap: Record<string, any> = {};
        
        if (uidsToFetch.length > 0) {
            const recruitUsers = await db.collection('accounts')
                .find({ 
                    $or: [
                        { uid: { $in: uidsToFetch } },
                        { _id: { $in: uidsToFetch.map((id: string) => {
                            try {
                                const { ObjectId } = require('mongodb');
                                return ObjectId.isValid(id) ? new ObjectId(id) : id;
                            } catch(e) { return id; }
                        }) } }
                    ]
                })
                .toArray();
            userMap = Object.fromEntries(recruitUsers.map(u => [u.uid || u._id.toString(), u]));
        }

        // Format result — rewardXP is stored directly on each game_affiliates record
        const result = affiliates.map(a => {
            const user = userMap[a.referredUid];
            return {
                name:     a.name || user?.name || "Unknown Operative",
                photoURL: a.photoURL || user?.photoURL || null,
                time:     a.date ? new Date(a.date).toISOString() : null,
                rewardXP: a.rewardXP ?? 0,  // XP earned by inviter for this referral (from game_affiliates)
            };
        });

        return NextResponse.json({
            success: true,
            affiliates: result
        });

    } catch (error: any) {
        console.error('Affiliate List Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
