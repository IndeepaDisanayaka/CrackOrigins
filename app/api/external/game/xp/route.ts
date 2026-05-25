import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const productCode = searchParams.get('productCode');

        if (!accountId) {
            return NextResponse.json({ 
                success: false, 
                error: 'Account ID is required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        // 1. Validate Product Code (if provided)
        if (productCode) {
            let gameQuery: any = { 
                $or: [
                    { slug: productCode },
                    { id: productCode },
                    { itchGameId: productCode.toString() }
                ] 
            };
            try { if (ObjectId.isValid(productCode)) gameQuery.$or.push({ _id: new ObjectId(productCode) }); } catch(e) {}

            const game = await db.collection('games').findOne(gameQuery);
            if (!game) {
                return NextResponse.json({ success: false, error: 'Invalid product code.' }, { status: 403 });
            }
        }

        // 2. Find User
        let userQuery: any = { 
            $or: [
                { _id: accountId as any }, 
                { uid: accountId } 
            ] 
        };
        try { if (ObjectId.isValid(accountId)) userQuery.$or.push({ _id: new ObjectId(accountId) }); } catch(e) {}

        const user = await db.collection('accounts').findOne(userQuery);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Account not found.' }, { status: 404 });
        }

        // Return user's total XP
        return NextResponse.json({ 
            success: true, 
            xp: user.xp || 0,
            level: Math.floor((user.xp || 0) / 1000) + 1, // Optional level calculation
            userName: user.name || user.displayName || 'User'
        });

    } catch (error: any) {
        console.error('Fetch XP Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
