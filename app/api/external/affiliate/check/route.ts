import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get('uid');
        const affiliateId = searchParams.get('affiliateId');

        if (!affiliateId) {
            return NextResponse.json({ 
                success: false, 
                error: 'Affiliate ID is required.' 
            }, { status: 400 });
        }

        const db = await getMongoDb();
        
        // Find the owner of this affiliate code
        const owner = await db.collection('accounts').findOne({ affiliateId });

        if (!owner) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid affiliate code.' 
            }, { status: 404 });
        }

        // Perform extra checks if uid is provided
        if (uid) {
            const user = await db.collection('accounts').findOne({ 
                $or: [{ uid: uid }, { _id: uid as any }] 
            });
            if (user) {
                if (user.affiliateId === affiliateId) {
                    return NextResponse.json({ 
                        success: false, 
                        error: 'You cannot use your own affiliate code.' 
                    }, { status: 400 });
                }
                if (user.referredBy) {
                    return NextResponse.json({ 
                        success: false, 
                        error: 'You already have an affiliate assigned.' 
                    }, { status: 400 });
                }
            }
        }

        return NextResponse.json({
            success: true,
            name: owner.name || "Unknown User",
            affiliateId: owner.affiliateId
        });

    } catch (error: any) {
        console.error('Affiliate Check Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
