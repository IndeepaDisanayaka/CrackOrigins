import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { createQuickGuestAccount } from '@/lib/admin-actions/users';
import { encryptWithKey } from '@/lib/crypto';

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ 
                success: false, 
                error: 'Email and code are required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();
        
        // Find the most recent valid code for this email
        const authRecord = await db.collection('auth_codes')
            .find({ email, code, used: false })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        if (authRecord.length === 0) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid verification code.' 
            }, { status: 401 });
        }

        const record = authRecord[0];

        // Check expiry
        if (new Date() > new Date(record.expiresAt)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Verification code has expired.' 
            }, { status: 401 });
        }

        // Mark as used
        await db.collection('auth_codes').updateOne(
            { _id: record._id },
            { $set: { used: true, verifiedAt: new Date() } }
        );

        // Create or Sync Guest Account
        const accountRes = await createQuickGuestAccount(email);

        if (!accountRes.success) {
            return NextResponse.json({ 
                success: false, 
                error: 'Verification successful but failed to link account: ' + accountRes.error
            }, { status: 500 });
        }

        // Fetch Full User Data
        let userSearchQuery: any = { 
            $or: [
                { _id: accountRes.uid as any },
                { uid: accountRes.uid }
            ] 
        };
        try {
            const { ObjectId } = require('mongodb');
            if (ObjectId.isValid(accountRes.uid)) {
                userSearchQuery.$or.push({ _id: new ObjectId(accountRes.uid) });
            }
        } catch (e) {}

        const userData = await db.collection('accounts').findOne(userSearchQuery);

        if (!userData) {
            return NextResponse.json({ 
                success: false, 
                error: 'User data not found.' 
            }, { status: 404 });
        }

        // Encrypt the entire user object using the verification 'code' as the key
        const encryptedData = encryptWithKey(JSON.stringify(userData), code);

        return NextResponse.json({ 
            success: true, 
            message: 'Authentication successful.',
            uid: accountRes.uid,
            isNew: accountRes.isNew || false,
            payload: encryptedData
        });

    } catch (error: any) {
        console.error('Verify Code Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
