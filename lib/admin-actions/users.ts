"use server";

import crypto from 'crypto';
import { getMongoDb } from '../mongodb';
import { encrypt, decrypt } from '../crypto';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';
import { ObjectId } from 'mongodb';
import { addAffiliateReward } from './payments';

export async function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

export async function hashEmail(email: string) {
    return crypto.createHash('sha256').update(await normalizeEmail(email)).digest('hex');
}

export async function findUserByEmail(email: string) {
    const db = await getMongoDb();
    const accountsCol = db.collection('accounts');
    const normalizedEmail:string = await normalizeEmail(email);
    const emailHash = await hashEmail(normalizedEmail);

    // 1. Try to find by hash (Recommended)
    let user = await accountsCol.findOne({ emailHash });
    if (user) return user;

    // 2. Try to find by plain email (in case not hashed yet or legacy)
    user = await accountsCol.findOne({ email: normalizedEmail });
    if (user) return user;

    // 3. Last resort: scan if encrypted but not hashed (Migration only)
    // To prevent infinite timeouts in callbacks, we limit this scan
    const cursor = accountsCol.find({ emailHash: { $exists: false } }).limit(200);
    while (await cursor.hasNext()) {
        const account = await cursor.next();
        if (account && account.email) {
            try {
                const decryptedEmail = decrypt(account.email);
                if (await normalizeEmail(decryptedEmail) === normalizedEmail) {
                    // Cache the hash for future lookups
                    await accountsCol.updateOne({ _id: account._id }, { $set: { emailHash } });
                    return account;
                }
            } catch (e) {
                // Ignore decryption errors
            }
        }
    }

    return null;
}

export async function createQuickGuestAccount(email: string) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        
        const normalizedEmail = await normalizeEmail(email);
        const emailHash = await hashEmail(normalizedEmail);

        // 1. Check if user already exists
        const existingUser = await findUserByEmail(normalizedEmail);
        if (existingUser) {
            return { 
                success: true, 
                alreadyExists: true, 
                uid: existingUser.uid || existingUser._id.toString() 
            };
        }

        // 2. Generate unique affiliate ID
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let affiliateId = '';
        let isUniqueSync = false;
        while (!isUniqueSync) {
            affiliateId = '';
            for (let i = 0; i < 8; i++) {
                affiliateId += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            const exists = await accountsCol.findOne({ affiliateId });
            if (!exists) isUniqueSync = true;
        }

        // 3. Create the record first to get the MongoDB _id
        const guestPayload: any = {
            email: encrypt(normalizedEmail),
            emailHash,
            isGuestEmail: true,
            xp: 0,
            created: new Date().toISOString(),
            last: new Date().toISOString(),
            updatedAt: new Date(),
            affiliateId,
            isOwner: false,
            country: "Unknown",
            name: "Guest Operative"
        };

        const result = await accountsCol.insertOne(guestPayload);
        const mongoId = result.insertedId.toString();

        return { success: true, isNew: true, uid: mongoId };
    } catch (error: any) {
        console.error("Error creating guest account:", error);
        return { success: false, error: error.message };
    }
}

export async function syncUserRecord(uid: string, data: {
    isOwner: boolean,
    name: string | null;
    email: string | null;
    photoURL: string | null;
    created: string | undefined;
    last: string | undefined;
    country?: string;
    referralId?: string | null;
    emailVerified?: boolean;
    authMethod?: 'google' | 'credentials' | 'guest';
}) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        
        let existing = await accountsCol.findOne({ 
            $or: [{ _id: uid as any }, { uid: uid }] 
        });
        
        // If not found by ID/UID, try finding by email to "sync" or "link"
        if (!existing && data.email) {
            // Check if this email is blacklisted due to a past deletion request
            const isBlacklisted = await db.collection("account_deletions").findOne({ 
                email: data.email, 
                status: 'completed' 
            });
            
            if (isBlacklisted) {
                return { 
                    success: false, 
                    error: "Your account has been permanently deleted at your request. You cannot create a new account with this email address as per the termination agreement." 
                };
            }

            existing = await findUserByEmail(data.email);
        }

        const isNewUser = !existing;

        let affiliateId = existing?.affiliateId || null;

        // Generate unique affiliate ID if it doesn't exist
        if (!affiliateId) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let isUnique = false;
            while (!isUnique) {
                affiliateId = '';
                for (let i = 0; i < 8; i++) {
                    affiliateId += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                const existingAffiliate = await accountsCol.findOne({ affiliateId });
                if (!existingAffiliate) isUnique = true;
            }
        }

        // Handle Referral Logic (new users only)
        let referredBy = existing?.referredBy || null;
        let inviterUid: string | null = null;
        if (isNewUser && data.referralId && data.referralId !== affiliateId) {
            const inviter = await accountsCol.findOne({ affiliateId: data.referralId });
            if (inviter) {
                referredBy = data.referralId;
                inviterUid = inviter.uid;
            }
        }

        const userPayload: any = {
            isOwner: isNewUser ? data.isOwner : (existing?.isOwner ?? data.isOwner),
            name: data.name,
            email: encrypt(data.email || "unknown"),
            emailHash: data.email ? await hashEmail(data.email) : null,
            photoURL: data.photoURL,
            created: existing?.created || data.created || new Date().toISOString(),
            last: data.last || new Date().toISOString(),
            updatedAt: new Date(),
            affiliateId,
            xp: existing?.xp ?? existing?.discount ?? 0,
            country: (data.country && data.country !== "Unknown") ? data.country : (existing?.country || "Unknown"),
            emailVerified: data.emailVerified ?? false,
            authMethod: data.authMethod || existing?.authMethod || (data.email ? 'credentials' : 'guest'),
        };

        if (referredBy) userPayload.referredBy = referredBy;

        await accountsCol.updateOne(
            { _id: uid as any },
            { $set: userPayload },
            { upsert: true }
        );

        // Also track in account_affiliates collection for proper affiliate counting
        if (isNewUser && referredBy && inviterUid) {
            const db2 = await getMongoDb();
            await db2.collection('account_affiliates').updateOne(
                { referredUid: uid },
                { $set: { referredUid: uid, referredBy: inviterUid, affiliateCode: referredBy, date: new Date() } },
                { upsert: true }
            );
            // Reward the inviter based on their current level
            try {
                await addAffiliateReward(inviterUid, 0, 'onetime', uid);
            } catch (e) { console.warn('Could not reward inviter:', e); }
        }

        return { success: true, affiliateId };
    } catch (error: any) {
        console.error("Error syncing user record:", error);
        return { success: false, error: error.message };
    }
}

export async function checkAdminStatus(uid: string) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        const data = await accountsCol.findOne({ 
            $or: [{ _id: uid as any }, { uid: uid }] 
        });
        
        if (!data) return { 
            success: false, isOwner: false, isAdmin: false, affiliateCount: 0, 
            metadata: { creationTime: null, lastSignInTime: null } 
        };

        const affiliateCount = await db.collection('account_affiliates').countDocuments({ referredBy: uid });
        const isOwner = data?.isOwner === true;
        const isAdmin = isOwner || !!data?.ruleId;

        const allLevels = await db.collection('reward_levels').find().toArray();
        const sortedLevelsAsc = [...allLevels].sort((a: any, b: any) => (a.min_xp || 0) - (b.min_xp || 0));
        const sortedLevelsDesc = [...allLevels].sort((a: any, b: any) => (b.min_xp || 0) - (a.min_xp || 0));
        
        const currentXp = data?.xp || data?.discount || 0;
        const currentLevel = sortedLevelsDesc.find((l: any) => currentXp >= (l.min_xp || 0)) || 
                           sortedLevelsAsc[0] || 
                           { title: 'starter', onetime_reward_xp: 5, payment_commision: 2, min_xp: 0, max_xp: 100 };

        const nextLevel = sortedLevelsAsc.find((l: any) => (l.min_xp || 0) > (currentLevel.min_xp || 0));

        return { 
            success: true, 
            isOwner,
            isAdmin,
            name: data?.name || null,
            photoURL: data?.photoURL || null,
            affiliateId: data?.affiliateId || null,
            xp: currentXp,
            reward_level: currentLevel.title || 'starter',
            affiliateLevelDetails: {
                title: currentLevel.title,
                onetime_reward_xp: currentLevel.onetime_reward_xp,
                payment_commision: currentLevel.payment_commision,
                min_xp: currentLevel.min_xp,
                max_xp: currentLevel.max_xp,
                nextLevelGoal: nextLevel ? nextLevel.min_xp : null
            },
            affiliateCount,
            country: data?.country || "Unknown",
            authMethod: data?.authMethod || (data?.password ? 'credentials' : 'google'),
            hasPassword: !!data?.password,
            metadata: {
                creationTime: data?.created ? new Date(data.created).toISOString() : null,
                lastSignInTime: data?.last ? new Date(data.last).toISOString() : null
            }
        };
    } catch (err) {
        console.error("Error in checkAdminStatus:", err);
        return { success: false, isOwner: false, affiliateCount: 0, metadata: { creationTime: null, lastSignInTime: null } };
    }
}

export async function getAdminDashboardData(adminUid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ 
            $or: [{ _id: adminUid as any }, { uid: adminUid }] 
        });
        
        if (!userDoc) return { success: false, error: "User not found." };
        
        const isOwner = userDoc.isOwner === true;
        let permissions: Record<string, string[]> = {};
        
        if (!isOwner) {
            const ruleId = userDoc.ruleId;
            if (!ruleId) return { success: false, error: "Unauthorized." };
            
            let ruleObjId: any = ruleId;
            try { ruleObjId = new ObjectId(ruleId); } catch {}
            const ruleDoc = await db.collection("account_rules").findOne({ _id: ruleObjId });
            if (!ruleDoc) return { success: false, error: "Rule not found." };
            permissions = ruleDoc.rules || {};
        }

        const canReadAny = isOwner || Object.values(permissions).some((p: any) => p.includes('READ'));
        if (!canReadAny) return { success: false, error: "No administrative access." };

        const hasAccess = (col: string) => isOwner || (permissions[col] || []).includes('READ');

        const results: Types.AdminDashboardData = { users: [], payments: [], offers: [], games: [], coupons: [] };

        // 1. Fetch Users (if authorized)
        if (hasAccess('account')) {
            const accountsSnap = await db.collection("accounts").find().toArray();
            const firestoreUsersMap = new Map<string, Types.UserRecord>();
            
            accountsSnap.forEach((data: any) => {
                let decryptedEmail = data.email || null;
                if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch { }
                }
                const id = data.uid || data._id?.toString();
                firestoreUsersMap.set(id, {
                    uid: id,
                    name: data.name || null,
                    email: decryptedEmail,
                    photoURL: data.photoURL || null,
                    isOwner: data.isOwner === true,
                    country: data.country || "Unknown",
                    ruleId: data.ruleId || null,
                    xp: data.xp || data.discount || 0,
                    reward_level: data.reward_level || data.affiliateLevel || "starter",
                });
            });

            // Firebase Auth is removed, so we only use MongoDB accounts
            const seenUids = new Set();
            firestoreUsersMap.forEach((user, uid) => {
                results.users.push(user);
                seenUids.add(uid);
            });
        }

        // 2. Fetch Offers/Games
        if (hasAccess('games') || hasAccess('offers')) {
            const [offersSnap, gamesSnap] = await Promise.all([
                db.collection("offers").find().toArray(),
                db.collection("games").find().toArray()
            ]);

            results.offers = offersSnap.map((data: any) => {
                return {
                    id: data._id?.toString(),
                    title: data.title || "",
                    originalPrice: data.originalPrice ?? 0,
                    discount: data.discount || "",
                    quantity: data.quantity ?? 0,
                    operatingSystem: data.operatingSystem || "",
                    platform: data.platform || "",
                    gameUrl: data.gameUrl || "",
                    expire: toIsoDate(data.expire) || data.expire || "",
                    isGiveaway: data.isGiveaway || false,
                    targetXP: data.targetXP || data.targetAffiliates || 10,
                    offerScope: data.offerScope || "local",
                    listed: toIsoDate(data.listed),
                };
            });

            results.games = gamesSnap.map((data: any) => {
                return {
                    id: data._id?.toString(),
                    title: data.title || "",
                    price: data.price || 0,
                    genre: Array.isArray(data.genre) ? data.genre.join(', ') : (data.genre || ""),
                    os: Array.isArray(data.os) ? data.os.join(', ') : (data.os || ""),
                    status: data.status || "released",
                    downloadCount: data.downloadCount || 0,
                    itchGameId: data.itchGameId || "",
                    itchUploadId: data.itchUploadId || "",
                    description: data.description || "",
                    logo: data.logo || "",
                    video: data.video || "",
                    images: data.images || [],
                    storage: data.storage || "",
                    showVideo: data.showVideo ?? true,
                    vrSupported: data.vrSupported ?? false,
                    requirements: data.requirement || { min: {}, max: {} },
                    listed: toIsoDate(data.createdAt) || toIsoDate(data.listed),
                };
            });
        }

        // 3. Fetch Coupons
        if (hasAccess('coupons')) {
            const couponsSnap = await db.collection("coupons").find().toArray();
            results.coupons = couponsSnap.map((data: any) => {
                return {
                    id: data._id?.toString(),
                    name: data.name || "",
                    discount: data.discount || "",
                    quantity: data.quantity ?? 0,
                    expire: data.expire || "",
                    isExpired: data.isExpired === true,
                    createdAt: toIsoDate(data.createdAt),
                    userId: data.userId || null,
                };
            });
        }

        // 4. Fetch Payments
        if (hasAccess('payments')) {
            // Note: MongoDB structure stores subcollections as top-level collections 
            // e.g. 'payments' and 'user_offers' with 'userId' or 'uid' field
            const [paymentsSnap, offersPurchSnap] = await Promise.all([
                db.collection("payments").find().toArray(),
                db.collection("account_offers").find().toArray()
            ]);

            const pushRecord = (data: any, source: "payment" | "offerPayment") => {
                const userId = data.userId || data.uid;
                if (!userId) return;

                let decryptedEmail = data.payerEmail || "unknown";
                if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch { }
                }
                
                results.payments.push({
                    id: data._id?.toString(),
                    userId,
                    game: data.game || "",
                    payerEmail: decryptedEmail,
                    amount: data.amount || "0",
                    status: data.status || "UNKNOWN",
                    purchaseDate: toIsoDate(data.purchaseDate) || new Date().toISOString(),
                    steamKey: data.steamKey || null,
                    paypalOrderId: data.paypalOrderId || null,
                    coupon: data.coupon || null,
                    source,
                });
            };

            paymentsSnap.forEach(d => pushRecord(d, "payment"));
            offersPurchSnap.forEach(d => pushRecord(d, "offerPayment"));

            results.payments.sort((a: any, b: any) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));
        }

        return { success: true, data: results };
    } catch (error: any) {
        console.error("Error getting admin dashboard data:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUserOwnerStatus(adminUid: string, targetUid: string, isOwner: boolean) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!adminDoc || !adminDoc.isOwner) return { success: false, error: "Unauthorized." };

        await db.collection("accounts").updateOne(
            { uid: targetUid },
            { $set: { isOwner: isOwner === true } }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error updating owner status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteUserAccount(adminUid: string, targetUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ 
            $or: [{ _id: adminUid as any }, { uid: adminUid }] 
        });
        const canDelete = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'account', 'DELETE'));
        
        if (!adminDoc || !canDelete) return { success: false, error: "Unauthorized." };

        // Delete from MongoDB collections
        await Promise.all([
            db.collection("accounts").deleteOne({ 
                $or: [{ _id: targetUid as any }, { uid: targetUid }] 
            }),
            db.collection("payments").deleteMany({ userId: targetUid }),
            db.collection("account_offers").deleteMany({ userId: targetUid }),
            db.collection("account_affiliates").deleteMany({ referredBy: targetUid })
        ]);

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user account:", error);
        return { success: false, error: error.message };
    }
}


export async function cleanupDeactivatedUsers(adminUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ 
            $or: [{ _id: adminUid as any }, { uid: adminUid }] 
        });
        const canDelete = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'account', 'DELETE'));

        if (!adminDoc || !canDelete) return { success: false, error: "Unauthorized." };

        const accounts = await db.collection("accounts").find().toArray();
        const uidsToDelete: string[] = [];

        for (const data of accounts) {
            if (data.isOwner) continue;

            const [paymentCount, offerCount] = await Promise.all([
                db.collection("payments").countDocuments({ userId: data.uid }),
                db.collection("account_offers").countDocuments({ userId: data.uid })
            ]);

            const hasActivity = paymentCount > 0 || offerCount > 0;
            
            const created = data.created ? new Date(data.created) : new Date(0);
            const isStale = (Date.now() - created.getTime()) > (24 * 60 * 60 * 1000);

            if (!hasActivity && isStale) {
                // If the user has no history and is stale, we can flag for potential cleanup
                // but we no longer specifically look for anonymous emails as they are removed
                // uidsToDelete.push(data.uid); 
            }
        }

        if (uidsToDelete.length === 0) return { success: true, count: 0 };

        // For now, automated cleanup of accounts is deactivated to prevent data loss.
        // The admin can delete individual users from the UI.
        return { success: true, count: 0 };
    } catch (error: any) {
        console.error("Error cleaning up deactivated users:", error);
    }
}

export async function getUserSupportData(adminUid: string, targetUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canRead = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'account', 'READ'));
        
        if (!adminDoc || !canRead) return { success: false, error: "Unauthorized." };

        const [userDoc, paymentsSnap, offersPurchSnap] = await Promise.all([
            db.collection("accounts").findOne({ uid: targetUid }),
            db.collection("payments").find({ userId: targetUid }).toArray(),
            db.collection("account_offers").find({ userId: targetUid }).toArray()
        ]);

        if (!userDoc) return { success: false, error: "User not found." };
        
        let decryptedEmail = userDoc.email || "unknown";
        if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
            try { decryptedEmail = decrypt(decryptedEmail); } catch { }
        }

        const payments: any[] = [];
        const pushRecord = (data: any, source: "payment" | "offerPayment") => {
            payments.push({
                id: data._id?.toString(),
                game: data.game || "",
                amount: data.amount || "0",
                status: data.status || "UNKNOWN",
                purchaseDate: toIsoDate(data.purchaseDate) || new Date().toISOString(),
                source,
            });
        };

        paymentsSnap.forEach(d => pushRecord(d, "payment"));
        offersPurchSnap.forEach(d => pushRecord(d, "offerPayment"));
        
        payments.sort((a: any, b: any) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));

        return {
            success: true,
            profile: {
                uid: targetUid,
                name: userDoc.name || "Unknown Operative",
                email: decryptedEmail,
                photoURL: userDoc.photoURL || null,
                country: userDoc.country || "Unknown",
                joined: toIsoDate(userDoc.created) || null,
            },
            payments
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMyPermissions(uid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection('accounts').findOne({ uid });
        
        if (!userDoc) return { success: false, error: "User not found." };
        
        if (userDoc?.isOwner) {
            return { success: true, isOwner: true, permissions: "*" };
        }
        
        const ruleId = userDoc?.ruleId;
        if (!ruleId) return { success: true, isOwner: false, permissions: {} };
        
        const { ObjectId } = await import('mongodb');
        let objId: any;
        try { objId = new ObjectId(ruleId); } catch { objId = ruleId; }
        
        const ruleDoc = await db.collection('account_rules').findOne({ _id: objId });
        if (!ruleDoc) return { success: true, isOwner: false, permissions: {} };
        
        return { success: true, isOwner: false, permissions: ruleDoc.rules || {} };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUserActivity(uid: string, page: number = 1, limit: number = 50) {
    try {
        const db = await getMongoDb();
        const skip = (page - 1) * limit;
        
        // 1. Fetch from offer_investments
        const investments = await db.collection('offer_investments').find({ uid }).toArray();
            
        // 2. Fetch from reward_history
        const rewards = await db.collection('reward_history').find({ uid }).toArray();

        // 3. Fetch from payments
        const payments = await db.collection('payments').find({ userId: uid }).toArray();
            
        // 4. Merge and map to activity format
        const merged: any[] = [
            ...investments.map((d: any) => ({
                id: d._id.toString(),
                type: 'spent',
                subType: d.isRefunded ? 'refund' : 'investment',
                xp: d.isRefunded ? d.xp : -d.xp,
                date: d.datetime ? new Date(d.datetime).toISOString() : new Date().toISOString(),
                title: d.isRefunded ? `Refund: ${d.offerTitle || 'Offer'}` : `Invested in ${d.offerTitle || 'Offer'}`,
                details: d.isRefunded ? `XP returned for unreached goal or lost challenge.` : `Committed XP to help reach the giveaway goal.`
            })),
            ...rewards.map((d: any) => ({
                id: d._id.toString(),
                type: 'gain',
                subType: d.type === 'onetime' ? 'referral' : 'commission',
                xp: d.rewardXP || 0,
                date: d.timestamp ? new Date(d.timestamp).toISOString() : new Date().toISOString(),
                title: d.type === 'onetime' ? 'New Recruit Reward' : 'Mission Commission',
                details: d.type === 'onetime' ? 'Successfully recruited a new agent.' : `Earned commission from a recruit's purchase.`
            })),
            ...payments.map((p: any) => ({
                id: p._id.toString(),
                type: 'purchase',
                title: `Game Purchase: ${p.game || 'Module'}`,
                details: `Amount: $${p.amount || '0'} — Status: ${p.status || 'VERIFIED'}`,
                date: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : new Date().toISOString()
            }))
        ];
        
        // Sort by date DESC
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const totalCount = merged.length;
        const pagedActivity = merged.slice(skip, skip + limit);

        return { success: true, activity: pagedActivity, hasMore: (skip + pagedActivity.length) < totalCount, totalCount };
    } catch (err: any) {
        console.error("Error fetching user activity:", err);
        return { success: false, error: err.message };
    }
}

export async function getUserExperiences(uid: string) {
    console.log("[DEBUG] Fetching experiences for identifier:", uid);
    try {
        const db = await getMongoDb();
        
        // 0. Find the user document to get all potential internal IDs (UID vs _id mismatch)
        const user = await db.collection("accounts").findOne({ 
            $or: [{ uid: uid }, { _id: uid as any }] 
        });

        const idSearch = [uid];
        if (user?._id) idSearch.push(user._id.toString());

        // 1. Scan game_activities using all potential account identifiers
        const activities = await db.collection("game_activities").find({
            $or: [
                { accountId: { $in: idSearch } }, 
                { uid: { $in: idSearch } },
                { userId: { $in: idSearch } }
            ]
        }).toArray();

        console.log(`[DEBUG] Found ${activities.length} activities for search space:`, idSearch);
        if (activities.length === 0) return { success: true, experiences: [] };

        // 2. Gather all potential identifiers (Slugs, IDs, itchGameIds)
        const identifiers = new Set<string>();
        activities.forEach((a: any) => {
            if (a.productCode) identifiers.add(a.productCode.toString());
            if (a.gameId) identifiers.add(a.gameId.toString());
        });

        const idList = Array.from(identifiers);

        // 3. Prepare queries to catch the game in the 'games' collection
        const objectIds: ObjectId[] = [];
        const stringQueries: any[] = [
            { slug: { $in: idList } },
            { id: { $in: idList } },
            { itchGameId: { $in: idList } },
            { _id: { $in: idList } } // Match if _id is stored as a string
        ];

        idList.forEach(id => {
            if (ObjectId.isValid(id)) {
                try { objectIds.push(new ObjectId(id)); } catch {}
            }
        });

        if (objectIds.length > 0) {
            stringQueries.push({ _id: { $in: objectIds } });
        }

        // 4. Execute search across all identifier vectors
        const games = await db.collection("games").find({ $or: stringQueries }).toArray();
        
        // 5. Transform into high-visibility experience cards
        const experiences = games.map(g => ({
            id: g._id.toString(),
            title: g.title || "Unknown Operative Activity",
            logo: g.logo || g.image || "/placeholder-game.png"
        }));

        // Eliminate duplicates (in case different activities pointed to the same game)
        const uniqueExperiences = Array.from(new Map(experiences.map(item => [item.id, item])).values());

        return { success: true, experiences: uniqueExperiences };
    } catch (err: any) {
        console.error("Experienced Platforms fetch error:", err);
        return { success: false, error: err.message };
    }
}

export async function getUserAffiliates(uid: string) {
    try {
        const db = await getMongoDb();
        
        // 1. Get all recruits for this user
        const affiliates = await db.collection('account_affiliates')
            .find({ referredBy: uid })
            .sort({ date: -1 })
            .toArray();
            
        if (affiliates.length === 0) return { success: true, affiliates: [] };
        
        // 2. Get user details for recruits
        const recruitUids = affiliates.map(a => a.referredUid);
        const recruitUsers = await db.collection('accounts')
            .find({ uid: { $in: recruitUids } })
            .toArray();
            
        const userMap = Object.fromEntries(recruitUsers.map(u => [u.uid, u]));
        
        // 3. Get reward history for these recruits if possible
        const rewards = await db.collection('reward_history')
            .find({ uid: uid, recruitUid: { $in: recruitUids } })
            .toArray();
            
        const rewardMap = Object.fromEntries(rewards.map(r => [r.recruitUid, r]));
        
        const result = affiliates.map(a => {
            const user = userMap[a.referredUid];
            const reward = rewardMap[a.referredUid];
            
            return {
                uid: a.referredUid,
                name: user?.name || "Unknown Operative",
                logo: user?.photoURL || null,
                joinedAt: a.date ? new Date(a.date).toISOString() : null,
                rewardXP: reward?.rewardXP || 5 // Fallback to 5 if not found (legacy data)
            };
        });
        
        return { success: true, affiliates: result };
    } catch (error: any) {
        console.error("Error fetching user affiliates:", error);
        return { success: false, error: error.message };
    }
}

export async function assignRuleToUser(adminUid: string, targetUserId: string, ruleId: string | null) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        await db.collection("accounts").updateOne(
            { uid: targetUserId },
            { $set: { ruleId: ruleId || null } }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getSupportChats(adminUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canRead = adminDoc?.isOwner || (adminDoc?.ruleId && (await hasPermission(adminUid, 'account', 'READ') || await hasPermission(adminUid, 'support', 'READ')));
        if (!adminDoc || !canRead) return { success: false, error: "Unauthorized." };

        // Group messages by user to identify inquiries
        // We look for any message where either 'from' or 'to' is a user (not admin)
        const inquiries = await db.collection("support_messages").aggregate([
            {
                $match: {
                    $or: [
                        { from: { $ne: "admin" } },
                        { to: { $ne: "admin" } }
                    ]
                }
            },
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$from", "admin"] },
                            "$to",
                            "$from"
                        ]
                    },
                    lastMessage: { $first: "$text" },
                    updatedAt: { $first: "$timestamp" },
                    senderName: { $first: "$senderName" }
                }
            },
            { $sort: { updatedAt: -1 } }
        ]).toArray();

        // Fetch user details for these inquiries
        const userUids = inquiries.map(i => i._id);
        const users = await db.collection("accounts").find({ uid: { $in: userUids } }).toArray();
        const userMap = Object.fromEntries(users.map(u => [u.uid, u]));

        return {
            success: true,
            chats: inquiries.map((i: any) => ({
                id: i._id, // User UID acts as the chat ID
                name: userMap[i._id]?.displayName || i.senderName || "Unknown Operative",
                lastMessage: i.lastMessage || "",
                updatedAt: i.updatedAt ? new Date(i.updatedAt).getTime() : Date.now(),
                ownerId: null, // Ownership logic can be added later if needed
                ownerName: null,
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSupportMessages(userUid: string) {
    try {
        const db = await getMongoDb();
        // Fetch messages where either from or to is the user
        const messages = await db.collection("support_messages")
            .find({
                $or: [
                    { from: userUid },
                    { to: userUid }
                ]
            })
            .sort({ timestamp: 1 })
            .toArray();

        return {
            success: true,
            messages: messages.map((m: any) => ({
                id: m._id.toString(),
                text: m.text || "",
                senderId: m.senderId || m.from || "",
                senderName: m.senderName || "Unknown",
                from: m.from,
                to: m.to,
                timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendSupportMessage(recipientUid: string, message: { text: string; senderId: string; senderName: string }) {
    try {
        const db = await getMongoDb();
        const now = new Date();

        // If sender is admin, 'from' is admin, 'to' is recipient (user)
        // If sender is user, 'from' is sender, 'to' is admin
        const adminDoc = await db.collection("accounts").findOne({ uid: message.senderId });
        const isAdmin = message.senderId === "admin" || adminDoc?.role === "admin" || adminDoc?.role === "owner" || adminDoc?.isOwner;
        
        await db.collection("support_messages").insertOne({
            from: isAdmin ? "admin" : message.senderId,
            to: isAdmin ? recipientUid : "admin",
            text: message.text,
            senderId: message.senderId,
            senderName: message.senderName,
            timestamp: now,
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignChat(adminUid: string, adminName: string, chatId: string) {
    try {
        const db = await getMongoDb();
        await db.collection("support_chats").updateOne(
            { _id: chatId as any },
            { $set: { ownerId: adminUid, ownerName: adminName, assignedAt: new Date() } }
        );
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSupportChat(adminUid: string, userUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        
        const canDelete = adminDoc?.isOwner || (adminDoc?.ruleId && (await hasPermission(adminUid, 'account', 'DELETE') || await hasPermission(adminUid, 'support', 'DELETE')));
        if (!adminDoc || !canDelete) return { success: false, error: "Unauthorized." };

        await db.collection("support_messages").deleteMany({
            $or: [
                { from: userUid },
                { to: userUid }
            ]
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserProfile(uid: string, data: { name?: string, photoURL?: string }) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.photoURL) updateData.photoURL = data.photoURL;
        updateData.updatedAt = new Date();

        await accountsCol.updateOne(
            { $or: [{ _id: uid as any }, { uid: uid }] },
            { $set: updateData }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function changeUserPassword(uid: string, data: { oldPassword?: string, newPassword: string, force?: boolean }) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        const bcrypt = await import('bcryptjs');

        const user = await accountsCol.findOne({ 
            $or: [{ _id: uid as any }, { uid: uid }] 
        });

        if (!user) return { success: false, error: "User not found." };

        // If not forcing (e.g. not from email reset), check old password
        if (!data.force) {
            if (user.password) {
                if (!data.oldPassword) return { success: false, error: "Current password is required." };
                const isMatch = await bcrypt.compare(data.oldPassword, user.password);
                if (!isMatch) return { success: false, error: "Incorrect current password." };
            }
        }

        const hashedPassword = await bcrypt.hash(data.newPassword, 10);
        await accountsCol.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    password: hashedPassword, 
                    authMethod: 'credentials', // Ensure they are marked as credentials users if they have a password
                    updatedAt: new Date() 
                } 
            }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function requestPasswordReset(email: string) {
    try {
        const db = await getMongoDb();
        const normalizedEmail = email.trim().toLowerCase();
        const user = await findUserByEmail(normalizedEmail);
        
        if (!user) return { success: false, error: "No account found with this email." };

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

        await db.collection("password_resets").updateOne(
            { email: normalizedEmail },
            { $set: { code, expiresAt, uid: user.uid || user._id.toString() } },
            { upsert: true }
        );

        const { sendPasswordResetEmail } = await import('../email');
        await sendPasswordResetEmail(normalizedEmail, code, user.name || "Operative");

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function verifyPasswordResetCode(email: string, code: string) {
    try {
        const db = await getMongoDb();
        const normalizedEmail = email.trim().toLowerCase();
        const resetRequest = await db.collection("password_resets").findOne({ email: normalizedEmail });

        if (!resetRequest || resetRequest.code !== code) {
            return { success: false, error: "Invalid verification code." };
        }

        if (new Date() > resetRequest.expiresAt) {
            return { success: false, error: "Verification code has expired." };
        }

        return { success: true, uid: resetRequest.uid };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
