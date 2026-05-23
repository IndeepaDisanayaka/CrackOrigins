import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { productCode, accountId, playTime, earnedXp } = await req.json();

        // 1. Basic Validation
        if (!productCode || !accountId || earnedXp === undefined) {
            return NextResponse.json({ 
                success: false, 
                error: 'Product code, account ID, and earned XP are required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        // 2. Validate Product Code
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

        // 3. Validate Account ID
        let userQuery: any = { 
            $or: [
                { _id: accountId as any }, 
                { uid: accountId } 
            ] 
        };
        try { if (ObjectId.isValid(accountId)) userQuery.$or.push({ _id: new ObjectId(accountId) }); } catch(e) {}

        const user = await db.collection('accounts').findOne(userQuery);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Invalid account ID.' }, { status: 404 });
        }

        // 4. Update the User's Main XP Balance
        await db.collection('accounts').updateOne(
            { _id: user._id },
            { 
                $inc: { xp: Number(earnedXp) },
                $set: { updatedAt: new Date() }
            }
        );

        // 5. Log the Game Activity
        const activityRecord = {
            productCode,
            gameId: game._id.toString(),
            accountId: user._id.toString(),
            playTime: playTime || 0,
            earnedXp: Number(earnedXp),
            timestamp: new Date(),
            isProcessed: true, // Mark as processed immediately since XP was added
            type: 'match_result'
        };

        const result = await db.collection('game_activities').insertOne(activityRecord);

        return NextResponse.json({ 
            success: true, 
            message: 'Game activity logged and XP updated successfully.',
            activityId: result.insertedId.toString(),
            newTotalXp: (user.xp || 0) + Number(earnedXp)
        });

    } catch (error: any) {
        console.error('Game Activity Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');

        if (!accountId) {
            return NextResponse.json({ 
                success: false, 
                error: 'Account ID is required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        // Validate Account ID exists
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

        // Fetch History
        const history = await db.collection('game_activities')
            .find({ accountId: user._id.toString() })
            .sort({ timestamp: -1 })
            .limit(50) // Limit to last 50 entries for performance
            .toArray();

        return NextResponse.json({ 
            success: true, 
            count: history.length,
            history: history
        });

    } catch (error: any) {
        console.error('Fetch Activity History Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
