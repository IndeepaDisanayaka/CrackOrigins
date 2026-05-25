import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { amount, mobileNo, country, accountId, productCode } = await req.json();

        // 1. Basic Validation
        if (!amount || !mobileNo || !country || !accountId || !productCode) {
            return NextResponse.json({ 
                success: false, 
                error: 'Amount, mobile number, country, account ID, and product code are required.' 
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

        // 4. Calculate XP to deduct (Conversion: $1.00 = 1000 XP)
        const xpToDeduct = Math.floor(Number(amount) * 1000);
        const currentXP = user.xp || 0;

        if (currentXP < xpToDeduct) {
            return NextResponse.json({ 
                success: false, 
                error: `Insufficient XP. You need ${xpToDeduct} XP to withdraw $${amount}. Your balance: ${currentXP} XP.` 
            }, { status: 400 });
        }

        // 5. Store the Withdrawal Request
        const withdrawalRecord = {
            amount: Number(amount),
            mobileNo,
            country,
            accountId: user._id.toString(),
            productCode,
            gameId: game._id.toString(),
            xpDeducted: xpToDeduct,
            status: 'PENDING',
            isProcessed: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.collection('game_withdrawals').insertOne(withdrawalRecord);

        // 6. Deduct XP from the User's Account
        await db.collection('accounts').updateOne(
            { _id: user._id },
            { 
                $inc: { xp: -xpToDeduct },
                $set: { updatedAt: new Date() }
            }
        );

        return NextResponse.json({ 
            success: true, 
            message: 'Withdrawal request submitted successfully.',
            withdrawalId: result.insertedId.toString(),
            xpDeducted: xpToDeduct,
            remainingXp: currentXP - xpToDeduct,
            isProcessed: false
        });

    } catch (error: any) {
        console.error('Withdrawal API Error:', error);
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

        // Fetch Withdrawal History
        const withdrawals = await db.collection('game_withdrawals')
            .find({ accountId: user._id.toString() })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        return NextResponse.json({ 
            success: true, 
            count: withdrawals.length,
            withdrawals: withdrawals
        });

    } catch (error: any) {
        console.error('Fetch Withdrawal History Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
