"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
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
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        const isNewUser = !userDoc.exists;
        
        const userData = userDoc.data();
        let affiliateId = userData?.affiliateId || null;
        let discount = userData?.discount || 0;
        let referredBy = userData?.referredBy || null;

        // 1. Generate unique affiliate ID if it doesn't exist
        if (!affiliateId) {
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let isUnique = false;
            while (!isUnique) {
                affiliateId = '';
                for (let i = 0; i < 8; i++) {
                    affiliateId += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                const existing = await adminDb.collection("accounts").where("affiliateId", "==", affiliateId).limit(1).get();
                if (existing.empty) isUnique = true;
            }
        }

        // 2. Handle Referral Logic (ONLY FOR NEW ACCOUNTS - ONE TIME CHANCE)
        if (isNewUser && data.referralId && data.referralId !== affiliateId) {
            const inviterQuery = await adminDb.collection("accounts").where("affiliateId", "==", data.referralId).limit(1).get();
            
            if (!inviterQuery.empty) {
                const inviterDoc = inviterQuery.docs[0];
                const inviterUid = inviterDoc.id;
                
                // Add registration reward to inviter
                await addAffiliateReward(inviterUid, 0, 'onetime');

                referredBy = data.referralId;
            }
        }

        // 3. Update/Create the user record
        const userPayload: any = {
            isOwner: isNewUser ? data.isOwner : (userData?.isOwner ?? data.isOwner),
            name: data.name,
            email: encrypt(data.email || "unknown"),
            photoURL: data.photoURL,
            created: data.created || null,
            last: data.last || null,
            updatedAt: Timestamp.now(),
            affiliateId,
            xp: userData?.xp ?? userData?.discount ?? 0,

            country: data.country || "Unknown",
            emailVerified: data.emailVerified ?? false
        };

        // Only insert referredBy if it has a value (not null/undefined)
        if (referredBy) {
            userPayload.referredBy = referredBy;
        }

        await userRef.set(userPayload, { merge: true });
        
        // SYNC TO RTDB SECURELY (New)
        try {
            const rtdb = await getAdminRtdb();
            await rtdb.ref(`accounts/${uid}/isOwner`).set(userPayload.isOwner);
        } catch (rtdbErr) {
            console.warn("RTDB Permission Sync Failed (syncUserRecord):", rtdbErr);
        }

        return { success: true, affiliateId };
    } catch (error: any) {
        console.error("Error syncing user record:", error);
        return { success: false, error: error.message };
    }
}

export async function checkAdminStatus(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const doc = await userRef.get();
        const data = doc.data();

        const affiliatesSnapshot = await userRef.collection("affiliates").get();
        const isOwner = data?.isOwner === true;
        const isAdmin = isOwner || !!data?.ruleId;

        // Sync to RTDB for security rules during status check (covers existing users)
        try {
            const rtdb = await getAdminRtdb();
            await rtdb.ref(`accounts/${uid}/isOwner`).set(isOwner);
            await rtdb.ref(`accounts/${uid}/isAdmin`).set(isAdmin);
        } catch (e) {}

        const levelTitle = data?.affiliateLevel || "starter";
        const levelsSnap = await adminDb.collection("reward_levels").get();
        const allLevels = levelsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Types.RewardLevel));
        
        // Find current level details
        const sortedLevelsAsc = [...allLevels].sort((a, b) => (a.min_xp || 0) - (b.min_xp || 0));
        const sortedLevelsDesc = [...allLevels].sort((a, b) => (b.min_xp || 0) - (a.min_xp || 0));
        
        const currentLevel = sortedLevelsDesc.find(l => (data?.xp || 0) >= (l.min_xp || 0)) || 
                           sortedLevelsAsc[0] || 
                           { title: 'starter', onetime_reward_xp: 5, payment_commision: 2, min_xp: 0, max_xp: 100 };


        // Find next level
        const sortedLevels = [...allLevels].sort((a, b) => (a.min_xp || 0) - (b.min_xp || 0));
        const nextLevel = sortedLevels.find(l => (l.min_xp || 0) > (currentLevel.min_xp || 0));

        return { 
            success: true, 
            isOwner: isOwner,
            isAdmin: isAdmin,
            affiliateId: data?.affiliateId || null,
            xp: data?.xp ?? data?.discount ?? 0,
            affiliateLevel: currentLevel.title,
            affiliateLevelDetails: {

                title: currentLevel.title,
                onetime_reward_xp: currentLevel.onetime_reward_xp,
                payment_commision: currentLevel.payment_commision,
                min_xp: currentLevel.min_xp,
                max_xp: currentLevel.max_xp,
                nextLevelGoal: nextLevel ? nextLevel.min_xp : null
            },
            affiliateCount: affiliatesSnapshot.size
        };
    } catch (err) {
        console.error("Error in checkAdminStatus:", err);
        return { success: false, isOwner: false, affiliateCount: 0 };
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
            
            accountsSnap.forEach(d => {
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
            const { getAuth } = await import('firebase-admin/auth');
            const authUsersResult = await getAuth().listUsers(1000);
            
            const seenUids = new Set();
            authUsersResult.users.forEach(authUser => {
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

            results.offers = offersSnap.docs.map(d => {
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

            results.games = gamesSnap.docs.map(d => {
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
            results.coupons = couponsSnap.docs.map(d => {
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

            paymentsGroupSnap.forEach((doc) => pushPayment(doc, "payment"));
            offersGroupSnap.forEach((doc) => pushPayment(doc, "offerPayment"));

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
        
        // SYNC TO RTDB SECURELY (New)
        try {
            const rtdb = await getAdminRtdb();
            await rtdb.ref(`accounts/${targetUid}/isOwner`).set(isOwner === true);
        } catch (rtdbErr) {
            console.warn("RTDB Permission Sync Failed (updateUserOwnerStatus):", rtdbErr);
        }

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
        const { getAuth } = await import('firebase-admin/auth');
        try {
            await getAuth().deleteUser(targetUid);
        } catch (authError) {
            console.warn("User already gone from Auth or error:", authError);
        }

        // Delete subcollections
        const [payments, offers, affiliates] = await Promise.all([
            userRef.collection("payments").get(),
            userRef.collection("offers").get(),
            userRef.collection("affiliates").get()
        ]);

        const batch = adminDb.batch();
        payments.forEach(d => batch.delete(d.ref));
        offers.forEach(d => batch.delete(d.ref));
        affiliates.forEach(d => batch.delete(d.ref));
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
        const { getAuth } = await import('firebase-admin/auth');
        const authUsers = await getAuth().listUsers(1000);
        authUsers.users.forEach(u => {
            if (u.providerData.length === 0 && !anonymousUids.includes(u.uid)) {
                anonymousUids.push(u.uid);
            }
        });

        if (anonymousUids.length === 0) return { success: true, count: 0 };

        // Delete in chunks of 50
        let totalDeleted = 0;
        for (let i = 0; i < anonymousUids.length; i += 50) {
            const batch = adminDb.batch();
            const chunk = anonymousUids.slice(i, i + 50);
            
            // Delete from Auth in parallel for this chunk
            await Promise.all(chunk.map(async (uid) => {
                try { 
                    await getAuth().deleteUser(uid); 
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
        const { getAuth } = await import('firebase-admin/auth');
        const authUsersResult = await getAuth().listUsers(1000);
        
        for (const authUser of authUsersResult.users) {
            if (seenUids.has(authUser.uid)) continue;
            
            // If it's an anonymous account in Auth with NO Firestore record, delete it
            if (authUser.providerData.length === 0) {
                uidsToDelete.push(authUser.uid);
            }
        }

        if (uidsToDelete.length === 0) return { success: true, count: 0 };

        let totalDeleted = 0;
        for (let i = 0; i < uidsToDelete.length; i += 400) {
            const batch = adminDb.batch();
            const chunk = uidsToDelete.slice(i, i + 400);
            for (const uid of chunk) {
                batch.delete(adminDb.collection("accounts").doc(uid));
                try { await getAuth().deleteUser(uid); } catch(e) {}
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

        paymentsSnap.forEach(doc => pushPayment(doc, "payment"));
        offersPurchSnap.forEach(doc => pushPayment(doc, "offerPayment"));
        payments.sort((a, b) => {
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
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(uid).get();
        
        if (!userDoc.exists) return { success: false, error: "User not found." };
        const userData = userDoc.data();
        
        if (userData?.isOwner) {
            return { success: true, isOwner: true, permissions: "*" };
        }
        
        const ruleId = userData?.ruleId;
        if (!ruleId) return { success: true, isOwner: false, permissions: {} };
        
        const ruleDoc = await adminDb.collection("account_rules").doc(ruleId).get();
        if (!ruleDoc.exists) return { success: true, isOwner: false, permissions: {} };
        
        return { success: true, isOwner: false, permissions: ruleDoc.data()?.rules || {} };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUserActivity(uid: string) {

    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        
        // 1. Fetch from unified activity collection
        const activitySnap = await userRef.collection("activity").orderBy("date", "desc").limit(50).get();
        const activity: any[] = activitySnap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            date: toIsoDate(d.data().date)
        }));


        // 2. Fallback: If unified activity is empty (legacy users), fetch from reward_history
        if (activity.length === 0) {
            const historySnap = await userRef.collection("reward_history").orderBy("timestamp", "desc").limit(20).get();
            for (const d of historySnap.docs) {
                const data = d.data();
                activity.push({
                    id: d.id,
                    type: 'gain',
                    subType: data.type || 'onetime',
                    xp: data.rewardXP || 0,
                    date: toIsoDate(data.timestamp),
                    title: data.type === 'onetime' ? 'Referral Reward' : 'Mission Commission',
                    details: `Legacy reward record.`
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

