"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized, Timestamp, FieldValue, getAuth } from '../firebase-admin';
import { getCollection, getMongoDb } from '../mongodb';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';
import { addAffiliateReward } from './payments';

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
}) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');
        
        const existing = await accountsCol.findOne({ uid });
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
        if (isNewUser && data.referralId && data.referralId !== affiliateId) {
            const inviter = await accountsCol.findOne({ affiliateId: data.referralId });
            if (inviter) {
                referredBy = data.referralId;
                // Could trigger reward here if needed
            }
        }

        const userPayload: any = {
            uid,
            isOwner: isNewUser ? data.isOwner : (existing?.isOwner ?? data.isOwner),
            name: data.name,
            email: encrypt(data.email || "unknown"),
            photoURL: data.photoURL,
            created: existing?.created || data.created || new Date().toISOString(),
            last: data.last || new Date().toISOString(),
            updatedAt: new Date(),
            affiliateId,
            xp: existing?.xp ?? existing?.discount ?? 0,
            country: data.country || "Unknown",
            emailVerified: data.emailVerified ?? false,
        };

        if (referredBy) userPayload.referredBy = referredBy;

        await accountsCol.updateOne(
            { uid },
            { $set: userPayload },
            { upsert: true }
        );

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
        const data = await accountsCol.findOne({ uid });
        
        if (!data) return { 
            success: false, isOwner: false, isAdmin: false, affiliateCount: 0, 
            metadata: { creationTime: null, lastSignInTime: null } 
        };

        const affiliateCount = await db.collection('affiliates').countDocuments({ referredBy: uid });
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
            affiliateId: data?.affiliateId || null,
            xp: currentXp,
            affiliateLevel: currentLevel.title || 'starter',
            affiliateLevelDetails: {
                title: currentLevel.title,
                onetime_reward_xp: currentLevel.onetime_reward_xp,
                payment_commision: currentLevel.payment_commision,
                min_xp: currentLevel.min_xp,
                max_xp: currentLevel.max_xp,
                nextLevelGoal: nextLevel ? nextLevel.min_xp : null
            },
            affiliateCount,
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
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        
        if (!userDoc.exists) return { success: false, error: "User not found." };
        
        const isOwner = userData?.isOwner === true;
        let permissions: Record<string, string[]> = {};
        
        if (!isOwner) {
            const ruleId = userData?.ruleId;
            if (!ruleId) return { success: false, error: "Unauthorized." };
            const ruleDoc = await adminDb.collection("account_rules").doc(ruleId).get();
            if (!ruleDoc.exists) return { success: false, error: "Rule not found." };
            permissions = ruleDoc.data()?.rules || {};
        }

        const canReadAny = isOwner || Object.values(permissions).some(p => p.includes('READ'));
        if (!canReadAny) return { success: false, error: "No administrative access." };

        const hasAccess = (col: string) => isOwner || (permissions[col] || []).includes('READ');

        const results: Types.AdminDashboardData = { users: [], payments: [], offers: [], games: [], coupons: [] };

        // 1. Fetch Users (if authorized)
        if (hasAccess('account')) {
            const accountsSnap = await adminDb.collection("accounts").get();
            const firestoreUsersMap = new Map<string, Types.UserRecord>();
            
            accountsSnap.forEach((d: any) => {
                const data = d.data() || {};
                let decryptedEmail = data.email || null;
                if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch { }
                }
                firestoreUsersMap.set(d.id, {
                    uid: d.id,
                    name: data.name || null,
                    email: decryptedEmail,
                    photoURL: data.photoURL || null,
                    isOwner: data.isOwner === true,
                    country: data.country || "Unknown",
                    ruleId: data.ruleId || null,
                    xp: data.xp || data.discount || 0,
                    affiliateLevel: data.affiliateLevel || "starter",
                });

            });

            await ensureFirebaseAdminInitialized();
            let authUsersResult: any = { users: [] };
            try {
                const auth = await getAuth();
                authUsersResult = await auth.listUsers(1000);
            } catch (e) {
                console.warn("Auth listing failed.");
            }
            
            const seenUids = new Set();
            authUsersResult.users.forEach((authUser: any) => {
                const fsUser = firestoreUsersMap.get(authUser.uid);
                results.users.push({
                    uid: authUser.uid,
                    name: fsUser?.name || authUser.displayName || null,
                    email: fsUser?.email || authUser.email || (authUser.providerData.length === 0 ? "anonymous" : null),
                    photoURL: fsUser?.photoURL || authUser.photoURL || null,
                    isOwner: fsUser?.isOwner === true,
                    country: fsUser?.country || "Unknown",
                    lastLoginAt: authUser.metadata.lastSignInTime,
                    createdAt: authUser.metadata.creationTime,
                    isAnonymous: authUser.providerData.length === 0,
                    ruleId: fsUser?.ruleId || null,
                    xp: fsUser?.xp || 0,
                    affiliateLevel: fsUser?.affiliateLevel || "starter",
                });

                seenUids.add(authUser.uid);
            });

            firestoreUsersMap.forEach((user, uid) => {
                if (!seenUids.has(uid)) results.users.push(user);
            });
        }

        // 2. Fetch Offers/Games
        if (hasAccess('games') || hasAccess('offers')) {
            const [offersSnap, gamesSnap] = await Promise.all([
                adminDb.collection("offers").get(),
                adminDb.collection("games").get()
            ]);

            results.offers = offersSnap.docs.map((d: any) => {
                const data = d.data() || {};
                return {
                    id: d.id,
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

            results.games = gamesSnap.docs.map((d: any) => {
                const data = d.data() || {};
                return {
                    id: d.id,
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
            const couponsSnap = await adminDb.collection("coupons").get();
            results.coupons = couponsSnap.docs.map((d: any) => {
                const data = d.data() || {};
                return {
                    id: d.id,
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
            const [paymentsGroupSnap, offersGroupSnap] = await Promise.all([
                adminDb.collectionGroup("payments").get(),
                adminDb.collectionGroup("offers").get()
            ]);

            const pushPayment = (doc: any, source: "payment" | "offerPayment") => {
                const pathParts = doc.ref.path.split('/');
                if (pathParts.length < 4 || pathParts[0] !== 'accounts') return;
                
                const userId = pathParts[1];
                const data = doc.data() || {};
                
                // For offers, only process purchase records
                if (source === "offerPayment" && !data.amount) return;

                let decryptedEmail = data.payerEmail || "unknown";
                if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch { }
                }
                
                results.payments.push({
                    id: doc.id,
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

            paymentsGroupSnap.forEach((doc: any) => pushPayment(doc, "payment"));
            offersGroupSnap.forEach((doc: any) => pushPayment(doc, "offerPayment"));

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
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        await adminDb.collection("accounts").doc(targetUid).set({ isOwner: isOwner === true }, { merge: true });
        

        return { success: true };
    } catch (error: any) {
        console.error("Error updating owner status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteUserAccount(adminUid: string, targetUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canDelete = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'account', 'DELETE'));
        
        if (!adminDoc.exists || !canDelete) return { success: false, error: "Unauthorized." };

        const userRef = adminDb.collection("accounts").doc(targetUid);
        
        // Delete from Firebase Auth
        await ensureFirebaseAdminInitialized();
        try {
            const auth = await getAuth();
            await auth.deleteUser(targetUid);
        } catch (authError) {
            console.warn("User deletion from Auth failed:", authError);
        }

        // Delete subcollections
        const [payments, offers, affiliates] = await Promise.all([
            userRef.collection("payments").get(),
            userRef.collection("offers").get(),
            userRef.collection("affiliates").get()
        ]);

        const batch = adminDb.batch();
        payments.forEach((d: any) => batch.delete(d.ref));
        offers.forEach((d: any) => batch.delete(d.ref));
        affiliates.forEach((d: any) => batch.delete(d.ref));
        batch.delete(userRef);
        
        await batch.commit();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user account:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteAnonymousUsers(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = adminDoc.data();
        const canDelete = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'account', 'DELETE'));
        if (!adminDoc.exists || !canDelete) return { success: false, error: "Unauthorized." };

        const accountsSnap = await adminDb.collection("accounts").get();
        const anonymousUids: string[] = [];

        // 1. Collect from Firestore
        for (const doc of accountsSnap.docs) {
            const data = doc.data();
            let email = data.email || "";
            if (email.includes(':')) {
                try { email = decrypt(email); } catch { }
            }
            if (!email || email === "unknown" || email === "anonymous") {
                anonymousUids.push(doc.id);
            }
        }

        // 2. Collect from Auth (to catch those not in Firestore)
        await ensureFirebaseAdminInitialized();
        try {
            const auth = await getAuth();
            const authUsers = await auth.listUsers(1000);
            authUsers.users.forEach((u: any) => {
                if (u.providerData.length === 0 && !anonymousUids.includes(u.uid)) {
                    anonymousUids.push(u.uid);
                }
            });
        } catch (e) {
            console.warn("Bulk anonymous cleanup from Auth skipped.");
        }

        if (anonymousUids.length === 0) return { success: true, count: 0 };

        // Delete in chunks of 50
        let totalDeleted = 0;
        for (let i = 0; i < anonymousUids.length; i += 50) {
            const batch = adminDb.batch();
            const chunk = anonymousUids.slice(i, i + 50);
            
            // Delete from Auth in parallel for this chunk
            await Promise.all(chunk.map(async (uid) => {
                try { 
                    const auth = await getAuth();
                    await auth.deleteUser(uid); 
                } catch(e) {
                    console.error(`Auth deletion failed for ${uid}:`, e);
                }
            }));

            for (const uid of chunk) {
                batch.delete(adminDb.collection("accounts").doc(uid));
            }
            await batch.commit();
            totalDeleted += chunk.length;
        }

        return { success: true, count: totalDeleted };
    } catch (error: any) {
        console.error("Error bulk deleting anonymous users:", error);
        return { success: false, error: error.message };
    }
}

export async function cleanupDeactivatedUsers(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = adminDoc.data();
        const canDelete = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'account', 'DELETE'));

        if (!adminDoc.exists || !canDelete) return { success: false, error: "Unauthorized." };

        const accountsSnap = await adminDb.collection("accounts").get();
        const uidsToDelete: string[] = [];
        const seenUids = new Set<string>();

        // 1. Check all Firestore users for activity
        for (const doc of accountsSnap.docs) {
            const data = doc.data();
            const isOwner = data.isOwner === true;
            if (isOwner) {
                seenUids.add(doc.id);
                continue;
            }

            const userRef = adminDb.collection("accounts").doc(doc.id);
            const [payments, offers] = await Promise.all([
                userRef.collection("payments").limit(1).get(),
                userRef.collection("offers").limit(1).get()
            ]);

            const hasActivity = !payments.empty || !offers.empty;
            
            // Safety: Don't delete accounts created in the last 24 hours
            const created = data.created ? (data.created.toDate ? data.created.toDate() : new Date(data.created)) : new Date(0);
            const isStale = (Date.now() - created.getTime()) > (24 * 60 * 60 * 1000);

            if (!hasActivity && isStale) {
                let email = data.email || "";
                if (email.includes(':')) {
                    try { email = decrypt(email); } catch { }
                }
                // If anonymous AND no activity
                if (!email || email === "unknown" || email === "anonymous") {
                    uidsToDelete.push(doc.id);
                }
            }
            seenUids.add(doc.id);
        }

        // 2. Check Auth for users that DON'T have a Firestore record (Ghost anonymous users)
        await ensureFirebaseAdminInitialized();
        try {
            const auth = await getAuth();
            const authUsersResult = await auth.listUsers(1000);
            
            for (const authUser of authUsersResult.users) {
                if (seenUids.has(authUser.uid)) continue;
                
                // If it's an anonymous account in Auth with NO Firestore record, delete it
                if (authUser.providerData.length === 0) {
                    uidsToDelete.push(authUser.uid);
                }
            }
        } catch (e) {
            console.warn("Auth check for deactivated users skipped.");
        }

        if (uidsToDelete.length === 0) return { success: true, count: 0 };

        let totalDeleted = 0;
        for (let i = 0; i < uidsToDelete.length; i += 400) {
            const batch = adminDb.batch();
            const chunk = uidsToDelete.slice(i, i + 400);
            for (const uid of chunk) {
                batch.delete(adminDb.collection("accounts").doc(uid));
                try { 
                    const auth = await getAuth();
                    await auth.deleteUser(uid); 
                } catch(e) {}
            }
            await batch.commit();
            totalDeleted += chunk.length;
        }

        return { success: true, count: totalDeleted };
    } catch (error: any) {
        console.error("Error cleaning up deactivated users:", error);
    }
}

export async function getUserSupportData(adminUid: string, targetUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canRead = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'account', 'READ'));
        
        if (!adminDoc.exists || !canRead) return { success: false, error: "Unauthorized." };

        const userRef = adminDb.collection("accounts").doc(targetUid);
        const [userDoc, paymentsSnap, offersPurchSnap] = await Promise.all([
            userRef.get(),
            userRef.collection("payments").get(),
            userRef.collection("offers").get()
        ]);

        if (!userDoc.exists) return { success: false, error: "User not found." };
        const userData = userDoc.data()!;
        
        let decryptedEmail = userData.email || "unknown";
        if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
            try { decryptedEmail = decrypt(decryptedEmail); } catch { }
        }

        const payments: any[] = [];
        const pushPayment = (doc: any, source: "payment" | "offerPayment") => {
            const data = doc.data() || {};
            payments.push({
                id: doc.id,
                game: data.game || "",
                amount: data.amount || "0",
                status: data.status || "UNKNOWN",
                purchaseDate: toIsoDate(data.purchaseDate) || new Date().toISOString(),
                source,
            });
        };

        paymentsSnap.forEach((doc: any) => pushPayment(doc, "payment"));
        offersPurchSnap.forEach((doc: any) => pushPayment(doc, "offerPayment"));
        payments.sort((a: any, b: any) => {
            const dateA = a.purchaseDate || "";
            const dateB = b.purchaseDate || "";
            return dateB.localeCompare(dateA);
        });

        return {
            success: true,
            profile: {
                uid: targetUid,
                name: userData.name || "Unknown Operative",
                email: decryptedEmail,
                photoURL: userData.photoURL || null,
                country: userData.country || "Unknown",
                joined: toIsoDate(userData.created) || null,
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

export async function getUserActivity(uid: string) {
    try {
        const db = await getMongoDb();
        
        // Fetch from unified activity collection
        const activityDocs = await db.collection('user_activity')
            .find({ uid })
            .sort({ date: -1 })
            .limit(50)
            .toArray();
        
        const activity: any[] = activityDocs.map((d: any) => ({
            id: d._id.toString(),
            type: d.type || 'account',
            subType: d.subType,
            xp: d.xp || 0,
            date: d.date ? new Date(d.date).toISOString() : new Date().toISOString(),
            title: d.title || 'Activity',
            details: d.details || ''
        }));

        // Fallback: also read payments from accounts collection
        if (activity.length === 0) {
            const payments = await db.collection('payments')
                .find({ userId: uid })
                .sort({ purchaseDate: -1 })
                .limit(20)
                .toArray();
            
            for (const p of payments) {
                activity.push({
                    id: p._id.toString(),
                    type: 'purchase',
                    title: `Game Purchase: ${p.game || 'Unknown'}`,
                    details: `Amount: $${p.amount || '0'} — Status: ${p.status || 'UNKNOWN'}`,
                    date: p.purchaseDate ? new Date(p.purchaseDate).toISOString() : new Date().toISOString()
                });
            }
        }

        return { success: true, activity };
    } catch (err: any) {
        console.error("Error fetching user activity:", err);
        return { success: false, error: err.message };
    }
}

export async function assignRuleToUser(adminUid: string, targetUserId: string, ruleId: string | null) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        await adminDb.collection("accounts").doc(targetUserId).update({
            ruleId: ruleId || null
        });

        // Also track in the rule document subcollection as per the user's diagram
        if (ruleId) {
            await adminDb.collection("account_rules").doc(ruleId).collection("accounts").doc(targetUserId).set({
                assigned_at: Timestamp.now()
            });
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

