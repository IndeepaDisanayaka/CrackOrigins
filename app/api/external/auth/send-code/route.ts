import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { sendAuthEmail } from '@/lib/email';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { email, productCode } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ 
                success: false, 
                error: 'Valid email is required.' 
            }, { status: 400 });
        }

        if (!productCode) {
            return NextResponse.json({ 
                success: false, 
                error: 'Product code is required for authorization.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        // Validate product code against games collection
        // Check by slug (id), itchGameId, or MongoDB _id
        let query: any = { 
            $or: [
                { slug: productCode },
                { id: productCode },
                { itchGameId: productCode.toString() }
            ] 
        };

        try {
            if (ObjectId.isValid(productCode)) {
                query.$or.push({ _id: new ObjectId(productCode) });
            }
        } catch(e) {}

        const game = await db.collection('games').findOne(query);

        if (!game) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid product code. Authorization denied.' 
            }, { status: 403 });
        }

        const TEST_EMAIL = "test.crackorigins@gmail.com";
        const TEST_CODE = "209671";

        // Generate 6 digit code
        const code = email === TEST_EMAIL ? TEST_CODE : Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiry date (5 minutes from now, or much longer for test email to ensure reliability)
        const expiresAt = email === TEST_EMAIL 
            ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours for test account
            : new Date(Date.now() + 5 * 60 * 1000);

        // Store in DB
        await db.collection('auth_codes').insertOne({
            email,
            code,
            createdAt: new Date(),
            expiresAt,
            used: false
        });

        // Skip Email for Test account
        if (email === TEST_EMAIL) {
            return NextResponse.json({ 
                success: true, 
                message: 'Test login initialized. Use code: ' + TEST_CODE 
            });
        }

        // Send Email
        const emailRes = await sendAuthEmail(email, code);

        if (!emailRes.success) {
            return NextResponse.json({ 
                success: false, 
                error: 'Failed to send verification email. ' + emailRes.error
            }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Verification code sent to ' + email 
        });

    } catch (error: any) {
        console.error('Send Code Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
