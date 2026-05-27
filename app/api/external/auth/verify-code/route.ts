import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { createQuickGuestAccount } from '@/lib/admin-actions/users';
import { encryptWithKey } from '@/lib/crypto';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        const { email, code, affiliateId, productCode } = await req.json();

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

        const uid = accountRes.uid;

        // --- Handle Affiliate Logic ---
        if (affiliateId) {
            // Fetch new user's own data (use ObjectId for reliability since uid is a string ID)
            let findQuery: any = { uid: uid };
            try { findQuery = { $or: [{ uid: uid }, { _id: new ObjectId(uid) }] }; } catch (e) {}
            
            const newUserDoc = await db.collection('accounts').findOne(findQuery);
            
            const newUserAffiliateId = newUserDoc?.affiliateId;
            const alreadyReferred = newUserDoc?.referredBy;

            // BUG FIX: Prevent self-referral and check if already has an affiliate
            if (affiliateId === newUserAffiliateId) {
                console.warn(`Self-referral attempt blocked for uid: ${uid}`);
            } else if (alreadyReferred) {
                console.warn(`User ${uid} already has an affiliate assigned: ${alreadyReferred}.`);
            } else {
                const inviter = await db.collection('accounts').findOne({ affiliateId });

                if (inviter) {
                    const inviterUid = inviter.uid || inviter._id.toString();

                    // Validate productCode
                    let game: any = null;
                    if (productCode) {
                        try {
                            if (ObjectId.isValid(productCode)) {
                                game = await db.collection('games').findOne({ _id: new ObjectId(productCode) });
                            }
                        } catch (e) {}
                        if (!game) {
                            game = await db.collection('games').findOne({ 
                                $or: [{ code: productCode }, { slug: productCode }, { _id: productCode as any }]
                            });
                        }
                    }

                    const isProductValid = !productCode || !!game;

                    if (isProductValid) {
                        const existingAff = await db.collection('game_affiliates').findOne({
                            referredUid: uid,
                            referredBy: inviterUid,
                            productCode: productCode || null
                        });

                        if (!existingAff) {
                            // Extract XP from 'affiliateReword' field as per instructions
                            const affiliateRewardBase: number = Number(game?.affiliateReword || 0);
                            const inviterXP   = affiliateRewardBase;
                            const receiverXP  = Math.floor(affiliateRewardBase * 0.5);

                            await db.collection('game_affiliates').insertOne({
                                referredUid:  uid,
                                referredBy:   inviterUid,
                                affiliateCode: affiliateId,
                                productCode:  productCode || null,
                                rewardXP:     inviterXP,
                                name:         newUserDoc?.name || "Unknown Operative",
                                photoURL:     newUserDoc?.photoURL || null,
                                date:         new Date()
                            });

                            // Grant XP to inviter
                            if (inviterXP > 0) {
                                await db.collection('accounts').updateOne(
                                    { $or: [{ uid: inviterUid }, { _id: inviterUid as any }] },
                                    { $inc: { xp: inviterXP, discount: inviterXP } }
                                );
                            }

                            // Grant 50% XP to receiver and set referredBy
                            const receiverUpdate: any = { referredBy: affiliateId };
                            const receiverSet: any = { 
                                $inc: { xp: receiverXP, discount: receiverXP },
                                $set: receiverUpdate
                            };
                            
                            // If no XP to inc, just set the field
                            if (receiverXP <= 0) {
                                await db.collection('accounts').updateOne(findQuery, { $set: receiverUpdate });
                            } else {
                                await db.collection('accounts').updateOne(findQuery, receiverSet);
                            }
                        }
                    }
                }
            }
        }

        // Fetch Full User Data (re-fetch to get updated xp/referredBy)
        let userSearchQuery: any = { 
            $or: [
                { _id: uid as any },
                { uid: uid }
            ] 
        };
        try {
            if (ObjectId.isValid(uid)) {
                userSearchQuery.$or.push({ _id: new ObjectId(uid) });
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
            uid: uid,
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
