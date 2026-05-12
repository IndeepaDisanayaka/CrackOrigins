"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized, Timestamp, FieldValue, getAuth } from './firebase-admin';

import { encrypt, decrypt } from './crypto';
import { getBlogPosts } from './blog';
import { revalidatePath, revalidateTag } from 'next/cache';

export interface RewardLevel {
    id?: string;
    title: string;
    description?: string;
    onetime_reward_xp: number;
    payment_commision: number;
    min_xp: number;
    max_xp: number;
}


export interface UserRecord {
    uid: string;
    name: string | null;
    email: string | null;
    photoURL: string | null;
    isOwner: boolean;
    country: string;
    lastLoginAt?: string | null;
    createdAt?: string | null;
    isAnonymous?: boolean;
    ruleId: string | null;
    xp: number;
    affiliateLevel: string;
    affiliateId?: string | null;
}

export interface PaymentRecord {
    id: string;
    userId: string;
    game: string;
    payerEmail: string;
    amount: string;
    status: string;
    purchaseDate: string;
    steamKey: string | null;
    paypalOrderId: string | null;
    coupon: string | null;
    source: "payment" | "offerPayment";
}

export interface AdminDashboardData {
    users: UserRecord[];
    payments: PaymentRecord[];
    offers: any[];
    games: any[];
    coupons: any[];
}

/**
 * Server Action: Generate a unique slug from title
 */
export async function generateGameSlug(title: string) {
    if (!title) return "";
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function toIsoDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6).toISOString();
    }
    try {
        return new Date(value).toISOString();
    } catch {
        return null;
    }
}

/**
 * Server Action: List a new game in the 'games' collection
 */
export async function listGame(adminUid: string, gameData: any) {
    if (!adminUid) return { success: false, error: "Unauthorized: Missing Admin UID." };
    if (!gameData || !gameData.title) return { success: false, error: "Validation: Game title is required." };

    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists) return { success: false, error: "Unauthorized: Admin account not found." };
        
        const userData = userDoc.data();
        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'games', 'WRITE'));

        if (!canWrite) {
            return { success: false, error: "Unauthorized: Insufficient permissions." };
        }

        const gameRef = adminDb.collection("games").doc(); 

        const { gameId, image, slug, ...cleanedData } = gameData;

        await gameRef.set({
            ...cleanedData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });

        try {
            revalidatePath('/games');
            revalidatePath('/');
        } catch (e) {}

        return { success: true, id: gameRef.id };
    } catch (error: any) {
        console.error("Error listing game:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Fetch all games from Firestore
 */
export async function getGames() {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("games").get();
        const games = await Promise.all(snapshot.docs.map(async (doc: any) => {
            const data = doc.data();
            const generatedSlug = await generateGameSlug(data.title || "");

            return {
                id: doc.id,
                slug: generatedSlug,
                title: data.title || "Untitled Game",
                genre: Array.isArray(data.genre) ? data.genre.join(" & ") : (data.genre || "Action"),
                description: data.description || "No description available.",
                image: data.image || data.logo || "/placeholder-game.png",
                logo: data.logo || "",
                video: data.video || "https://www.youtube.com/embed/AiA6gZN_usg",
                price: typeof data.price === 'number' ? (data.price === 0 ? "Free" : `$${data.price.toFixed(2)}`) : (data.price || "Free"),
                requirements: {
                    min: data.requirement?.min || "Minimum requirements not specified.",
                    max: data.requirement?.max || "Recommended requirements not specified."
                },
                os: Array.isArray(data.os) ? data.os.join(", ") : (data.os || "Windows"),
                storage: data.storage || (data.requirement?.min?.storage || "Not specified"),
                vrSupported: data.vrSupported ?? (data.requirement?.min?.vrSupported ?? false),
                itchUploadId: data.itchUploadId || "",
                itchGameId: data.itchGameId || "",
                images: data.images || [],
                showVideo: data.showVideo ?? true
            };
        }));
        return { success: true, games };
    } catch (error: any) {
        console.error("Error fetching games:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Helper: Find user UID by email (decrypted check)
 */
export async function findUserByEmail(email: string) {
    if (!email) return null;
    const adminDb = await getAdminDb();
    const emailLower = email.toLowerCase();

    // 1. Try efficient search if 'searchEmail' field exists
    const fastSearch = await adminDb.collection("accounts").where("searchEmail", "==", emailLower).limit(1).get();
    if (!fastSearch.empty) return fastSearch.docs[0].id;

    // 2. Fallback: Full scan for older encrypted records
    const accounts = await adminDb.collection("accounts").get();
    let foundUid: string | null = null;

    accounts.forEach((doc: any) => {
        const data = doc.data();
        let decryptedEmail = data.email;
        if (decryptedEmail && decryptedEmail.includes(':')) {
            try {
                decryptedEmail = decrypt(decryptedEmail);
                if (decryptedEmail && decryptedEmail.toLowerCase() === emailLower) {
                    foundUid = doc.id;
                }
            } catch (e) { }
        }
    });

    return foundUid;
}

/**
 * Server Action: Sync user profile to Firestore securely (Admin SDK)
 */
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
        
        // --- LINKING LOGIC ---
        // Check if UID exists. If not, check if email exists under another UID.
        let userRef = adminDb.collection("accounts").doc(uid);
        let userDoc = await userRef.get();
        
        if (!userDoc.exists && data.email) {
            const existingUid = await findUserByEmail(data.email);
            if (existingUid) {
                console.log(`Linking Google login (${uid}) to existing account (${existingUid}) for email: ${data.email}`);
                uid = existingUid;
                userRef = adminDb.collection("accounts").doc(uid);
                userDoc = await userRef.get();
            }
        }
        // ---------------------

        const isNewUser = !userDoc.exists;

        const userData = userDoc.data();
        let affiliateId = userData?.affiliateId || null;
        const discount = userData?.discount || 0;
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
            emailVerified: data.emailVerified ?? false,
            searchEmail: data.email ? data.email.toLowerCase() : null
        };

        // Only insert referredBy if it has a value (not null/undefined)
        if (referredBy) {
            userPayload.referredBy = referredBy;
        }

        await userRef.set(userPayload, { merge: true });



        return { success: true, affiliateId, uid };
    } catch (error: any) {
        console.error("Error syncing user record:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get list of games purchased by a user securely
 */
export async function getOwnedGames(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const paymentsRef = adminDb.collection("accounts").doc(uid).collection("payments");
        const snapshot = await paymentsRef.where("status", "==", "COMPLETED").get();

        const games: string[] = [];
        const details: Record<string, any> = {};

        const userRef = adminDb.collection("accounts").doc(uid);
        const [paymentsSnap, offersSnap] = await Promise.all([
            userRef.collection("payments").where("status", "==", "COMPLETED").get(),
            userRef.collection("offers").get()
        ]);

        const processDoc = (doc: any, isOffer = false) => {
            const data = doc.data();
            if (data.game) {
                games.push(data.game);

                let decryptedEmail = data.payerEmail || "unknown";
                if (decryptedEmail && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch (e) { }
                }

                details[data.game] = {
                    activationKey: data.activationKey || data.paypalOrderId || doc.id,
                    purchaseDate: data.purchaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
                    amount: data.amount,
                    status: data.status,
                    payerEmail: decryptedEmail,
                    isOffer
                };
            }
        };

        paymentsSnap.forEach((doc: any) => processDoc(doc));
        offersSnap.forEach((doc: any) => processDoc(doc, true));

        return { success: true, games, details };
    } catch (error: any) {
        console.error("Error fetching owned games:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Validate a coupon code
 */
export async function validateCoupon(couponCode: string) {
    try {
        const adminDb = await getAdminDb();
        const couponRef = adminDb.collection("coupons").doc(couponCode);
        const couponDoc = await couponRef.get();

        if (!couponDoc.exists) return { success: false, error: "Invalid coupon code." };

        const data = couponDoc.data();
        if (!data || data.isExpired === true || data.quantity <= 0) {
            return { success: false, error: "Coupon expired or unavailable." };
        }

        if (data.expire) {
            const expireDate = new Date(data.expire);
            if (data.expire.length <= 10) expireDate.setHours(23, 59, 59, 999);
            if (expireDate < new Date()) return { success: false, error: "This coupon has expired." };
        }

        return {
            success: true,
            coupon: {
                code: couponCode,
                name: data.name,
                discount: data.discount,
                quantity: data.quantity,
                expire: data.expire,
            }
        };
    } catch (error: any) {
        console.error("Error validating coupon:", error);
        return { success: false, error: "Failed to validate coupon." };
    }
}

/**
 * Server Action: Create a new coupon (Admin only)
 */
export async function createCoupon(adminUid: string, couponData: {
    name: string;
    discount: string;
    quantity: number;
    expire: string;
}) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        const couponCode = Math.random().toString(36).substring(2, 18).toUpperCase();

        await adminDb.collection("coupons").doc(couponCode).set({
            ...couponData,
            createdAt: Timestamp.now(),
            isExpired: false,
        });

        return { success: true, couponCode };
    } catch (error: any) {
        console.error("Error creating coupon:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Check if user is an owner
 */
export async function checkAdminStatus(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const doc = await userRef.get();
        const data = doc.data();

        const affiliatesSnapshot = await userRef.collection("affiliates").get();
        const isOwner = data?.isOwner === true;
        const isAdmin = isOwner || !!data?.ruleId;



        const levelTitle = data?.affiliateLevel || "starter";
        const levelsSnap = await adminDb.collection("reward_levels").get();
        const allLevels = levelsSnap.docs.map((d: any) => ({ ...d.data(), id: d.id } as RewardLevel));

        // Find current level details
        const sortedLevelsAsc = [...allLevels].sort((a: any, b: any) => (a.min_xp || 0) - (b.min_xp || 0));
        const sortedLevelsDesc = [...allLevels].sort((a: any, b: any) => (b.min_xp || 0) - (a.min_xp || 0));

        const currentLevel = sortedLevelsDesc.find(l => (data?.xp || 0) >= (l.min_xp || 0)) ||
            sortedLevelsAsc[0] ||
            { title: 'starter', onetime_reward_xp: 5, payment_commision: 2, min_xp: 0, max_xp: 100 };


        // Find next level
        const sortedLevels = [...allLevels].sort((a: any, b: any) => (a.min_xp || 0) - (b.min_xp || 0));
        const nextLevel = sortedLevels.find((l: any) => (l.min_xp || 0) > (currentLevel.min_xp || 0));

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
            affiliateCount: affiliatesSnapshot.size,
            country: data?.country || "Unknown",
            metadata: {
                creationTime: toIsoDate(data?.created) || null,
                lastSignInTime: toIsoDate(data?.last) || null
            }
        };
    } catch (err) {
        console.error("Error in checkAdminStatus:", err);
        return { success: false, isOwner: false, affiliateCount: 0, metadata: { creationTime: null, lastSignInTime: null } };
    }
}

/**
 * Server Action: Get admin dashboard data (Owner only)
 */
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

        const results: AdminDashboardData = { users: [], payments: [], offers: [], games: [], coupons: [] };

        // 1. Fetch Users (if authorized)
        if (hasAccess('account')) {
            const accountsSnap = await adminDb.collection("accounts").get();
            const firestoreUsersMap = new Map<string, UserRecord>();

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
            // Try to use auth if available, otherwise fallback gracefully
            let authUsersResult: any = { users: [] };
            try {
                const auth = await getAuth();
                authUsersResult = await auth.listUsers(1000);
            } catch (e) {
                console.warn("Firebase Auth Listing failed.");
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

/**
 * Server Action: Update user owner status (Owner only)
 */
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

/**
 * Server Action: Generate a personal coupon using affiliate discount
 */
export async function generateAffiliateCoupon(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "User not found." };

        const data = userDoc.data()!;
        const xpVal = data.xp ?? data.discount ?? 0;
        if (xpVal <= 0) return { success: false, error: "No XP available." };

        const couponCode = `REF-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + 1);

        await adminDb.collection("coupons").doc(couponCode).set({
            name: `Affiliate Reward (${data.name})`,
            discount: `${xpVal} XP`,
            quantity: 1,
            expire: expireDate.toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            isExpired: false,
            userId: uid
        });

        await userRef.update({ xp: 0, discount: 0 });
        return { success: true, couponCode };
    } catch (error: any) {
        console.error("Error generating affiliate coupon:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get all coupons belonging to a user
 */
export async function getUserCoupons(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("coupons").where("userId", "==", uid).get();

        const coupons: any[] = [];
        snapshot.forEach((doc: any) => {
            const data = doc.data();
            coupons.push({
                code: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        });

        return { success: true, coupons };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Verify a coupon code
 */
export async function verifyCoupon(couponCode: string) {
    try {
        const adminDb = await getAdminDb();
        const doc = await adminDb.collection("coupons").doc(couponCode.toUpperCase()).get();

        if (!doc.exists) return { success: false, error: "Invalid coupon code." };

        const data = doc.data()!;
        if (data.isExpired) return { success: false, error: "Coupon has expired." };
        if (data.quantity <= 0) return { success: false, error: "Coupon is no longer available." };

        const expireDate = new Date(data.expire);
        if (expireDate < new Date()) {
            await adminDb.collection("coupons").doc(couponCode.toUpperCase()).update({ isExpired: true });
            return { success: false, error: "Coupon has expired." };
        }

        return {
            success: true,
            discount: data.discount,
            couponId: doc.id
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Create a new offer (Admin only)
 */
export async function createOffer(adminUid: string, offerData: {
    id: string;
    title: string;
    originalPrice: number;
    discount: string;
    expire: string;
    quantity: number;
    operatingSystem: string;
    platform: string;
    gameUrl?: string;
    isGiveaway?: boolean;
    targetXP?: number;
    targetAffiliates?: number;
}) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'offers', 'WRITE'));

        if (!userDoc.exists || !canWrite) {
            return { success: false, error: "Unauthorized." };
        }


        await adminDb.collection("offers").doc(offerData.id).set({
            ...offerData,
            originalPrice: Number(offerData.originalPrice || 0),
            quantity: Number(offerData.quantity || 0),
            expire: Timestamp.fromDate(new Date(offerData.expire || Date.now())),
            listed: Timestamp.now(),
            targetXP: Number(offerData.targetXP || offerData.targetAffiliates || 10),
        });

        try {
            revalidatePath('/offers');
            revalidateTag('offers', 'max');
        } catch (e) {}

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update user's Steam key for a specific payment (Admin only)
 */
export async function updateUserKey(adminUid: string, uid: string, paymentId: string, steamKey: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canUpdate = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'payments', 'UPDATE'));

        if (!adminDoc.exists || !canUpdate) return { success: false, error: "Unauthorized." };

        const encryptedKey = encrypt(steamKey);
        const userRef = adminDb.collection("accounts").doc(uid);

        // Try updating in both subcollections as we don't know which one holds it
        const [paymentDoc, offerDoc] = await Promise.all([
            userRef.collection("payments").doc(paymentId).get(),
            userRef.collection("offers").doc(paymentId).get()
        ]);

        if (paymentDoc.exists) {
            await userRef.collection("payments").doc(paymentId).update({ steamKey: encryptedKey });
            return { success: true };
        } else if (offerDoc.exists) {
            await userRef.collection("offers").doc(paymentId).update({ steamKey: encryptedKey });
            return { success: true };
        }

        return { success: false, error: "Purchase record not found." };
    } catch (e: any) {
        console.error("Error updating key:", e);
        return { success: false, error: e.message };
    }
}

/**
 * Server Action: Get user's Steam key securely (Self only)
 */
export async function getUserKey(uid: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);

        // 1. Try 'offers' subcollection (New way: doc id is offer id)
        const offerDoc = await userRef.collection("offers").doc(offerId).get();
        let data = offerDoc.exists ? offerDoc.data() : null;

        // 2. Try 'payments' subcollection (Old way for backward compatibility)
        if (!data) {
            const paymentsRef = userRef.collection("payments");
            const snapshot = await paymentsRef.where("offerId", "==", offerId).limit(1).get();
            if (!snapshot.empty) data = snapshot.docs[0].data();
        }

        if (!data) return { success: false, error: "Purchase record not found." };

        if (!data.steamKey) return { success: false, error: "Key not yet available. Still waiting for verification." };

        const keyVal = data.steamKey;

        // If it's encrypted (contains :), decrypt it
        if (keyVal.includes(':')) {
            try {
                return { success: true, steamKey: decrypt(keyVal) };
            } catch (err) {
                console.error("Decryption failure for key:", offerId, err);
                return { success: false, error: "Security mismatch: Key could not be decrypted." };
            }
        }

        // Return as-is if it's not encrypted (legacy support)
        return { success: true, steamKey: keyVal };
    } catch (e: any) {
        console.error("getUserKey Global Error:", e);
        return { success: false, error: "Failed to retrieve key due to a server error." };
    }
}

export async function getAffiliateProgress(uid: string, listedTime: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();

        // Query the user's own 'offers' subcollection to see their individual investment progress
        const offerDoc = await adminDb.collection("accounts").doc(uid).collection("offers").doc(offerId).get();

        if (!offerDoc.exists) {
            return { success: true, count: 0 };
        }

        const data = offerDoc.data();
        return { success: true, count: data?.investedXP || 0 };
    } catch (err: any) {
        console.error("Error fetching affiliate progress:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Server Action: Delete a blog post file (Owner only)
 */
export async function deleteBlogPost(adminUid: string, blogId: string, slug?: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canDelete = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'blogs', 'DELETE'));

        if (!adminDoc.exists || !canDelete) return { success: false, error: "Unauthorized." };

        let success = false;
        if (blogId) {
            // Delete from 'contents' collection
            const contentsSnap = await adminDb.collection('contents').where('blogId', '==', blogId).get();
            const batch = adminDb.batch();
            contentsSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
            batch.delete(adminDb.collection('blogs').doc(blogId));
            await batch.commit();
            success = true;
        } else if (slug) {
            const blogQuery = await adminDb.collection('blogs').where('slug', '==', slug).limit(1).get();
            if (!blogQuery.empty) {
                const bId = blogQuery.docs[0].id;
                const contentsSnap = await adminDb.collection('contents').where('blogId', '==', bId).get();
                const batch = adminDb.batch();
                contentsSnap.docs.forEach((doc: any) => batch.delete(doc.ref));
                batch.delete(blogQuery.docs[0].ref);
                await batch.commit();
                success = true;
            }
        }

        try {
            revalidatePath('/blog');
            revalidatePath('/blogs');
            revalidateTag('blogs', 'max');
        } catch (e) {}

        return { success };
    } catch (error: any) {
        console.error("Error deleting blog post:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Fetch all blog posts for management
 */
export async function getBlogPostsAction() {
    try {
        const posts = await getBlogPosts();
        return { success: true, posts };
    } catch (error: any) {
        console.error("Error fetching blogs in action:", error);
        return { success: false, error: error.message };
    }
}


/**
 * Server Action: Delete a specific user account (Owner only)
 */
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

/**
 * Server Action: Bulk delete anonymous users (Owner only)
 */
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
                } catch (e) {
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

/**
 * Server Action: Cleanup deactivated/stale accounts (Owner only)
 * For now, "deactivated" is defined as accounts with no email and no payments.
 */
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
                } catch (e) { }
            }
            await batch.commit();
            totalDeleted += chunk.length;
        }

        return { success: true, count: totalDeleted };
    } catch (error: any) {
        console.error("Error cleaning up deactivated users:", error);
    }
}

/**
 * Server Action: Get user support profile and transaction history
 */
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

/**
 * Server Action: Fetch a single game by its slug (generated from title)
 */
export async function getGameBySlug(slug: string) {
    console.log(`[getGameBySlug] Fetching game with slug: "${slug}"`);
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("games").get();
        console.log(`[getGameBySlug] Found ${snapshot.size} games in collection.`);

        const decodedSlug = decodeURIComponent(slug);
        const inputSlugNormalized = await generateGameSlug(decodedSlug);

        let targetDoc = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const generated = await generateGameSlug(data.title || "");

            if (generated === inputSlugNormalized) {
                targetDoc = doc;
                break;
            }
        }

        if (!targetDoc) return { success: false, error: "Game not found." };

        const data = targetDoc.data();
        const game = {
            id: targetDoc.id,
            ...data,
            slug: slug,
            requirements: {
                min: data.requirement?.min || {},
                max: data.requirement?.max || {}
            },
            time: toIsoDate(data.time) || new Date().toISOString(),
            downloadCount: data.downloadCount || 0
        };

        // Fetch updates
        const updatesSnap = await targetDoc.ref.collection("updates").orderBy("date", "desc").get();
        const updates = await Promise.all(updatesSnap.docs.map(async (u: any) => {
            const uData = u.data();
            const uSlug = await generateGameSlug(uData.title || "");
            return {
                id: u.id,
                ...uData,
                slug: uSlug,
                date: toIsoDate(uData.date) || new Date().toISOString(),
                createdAt: toIsoDate(uData.createdAt) || new Date().toISOString()
            };
        }));

        // Fetch reviews
        const reviewsSnap = await targetDoc.ref.collection("reviews").orderBy("time", "desc").get();
        const reviews = reviewsSnap.docs.map((r: any) => ({
            id: r.id,
            ...r.data(),
            time: toIsoDate(r.data().time) || new Date().toISOString()
        }));

        return { success: true, game, updates, reviews };
    } catch (error: any) {
        console.error("Error fetching game by slug:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Add a review to a game (Using user ID as document ID)
 */
export async function addGameReview(gameId: string, reviewData: {
    userId: string,
    userName?: string,
    userPhoto?: string,
    rating: string,
    message: string
}) {
    try {
        const adminDb = await getAdminDb();
        const gameRef = adminDb.collection("games").doc(gameId);
        const { userId, ...rest } = reviewData;

        await gameRef.collection("reviews").doc(userId).set({
            ...rest,
            time: Timestamp.now()
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding review:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Fetch a single game update
 */
export async function getGameUpdate(gameSlug: string, updateId: string) {
    try {
        const adminDb = await getAdminDb();

        // Find game by slug
        const gamesSnap = await adminDb.collection("games").get();
        let targetGameDoc = null;
        for (const doc of gamesSnap.docs) {
            const data = doc.data();
            const generated = await generateGameSlug(data.title || "");
            if (generated === gameSlug) {
                targetGameDoc = doc;
                break;
            }
        }

        if (!targetGameDoc) return { success: false, error: "Game not found." };

        // Fetch specific update by checking all update slugs
        const allUpdatesSnap = await targetGameDoc.ref.collection("updates").get();
        let targetUpdateDoc = null;
        for (const uDoc of allUpdatesSnap.docs) {
            const uData = uDoc.data();
            const uGenerated = await generateGameSlug(uData.title || "");
            if (uGenerated === updateId) { // updateId is now the slug
                targetUpdateDoc = uDoc;
                break;
            }
        }

        if (!targetUpdateDoc) return { success: false, error: "Update not found." };

        const updateData = targetUpdateDoc.data();
        const update = {
            id: targetUpdateDoc.id,
            ...updateData,
            date: toIsoDate(updateData?.date) || new Date().toISOString(),
            createdAt: toIsoDate(updateData?.createdAt) || new Date().toISOString(),
            gameTitle: targetGameDoc.data().title
        };

        return { success: true, update };
    } catch (error: any) {
        console.error("Error fetching game update:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Increment game download count
 */
export async function incrementDownloadCount(gameId: string, userId?: string) {
    try {
        const adminDb = await getAdminDb();
        const gameRef = adminDb.collection("games").doc(gameId);

        // If we have a user ID, we can prevent duplicate counts for that user
        if (userId) {
            const downloadId = `${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${gameId}`;
            const downloadRef = adminDb.collection("downloads").doc(downloadId);
            const downloadDoc = await downloadRef.get();

            if (downloadDoc.exists) {
                // Already counted for this user
                return { success: true, alreadyCounted: true };
            }

            // Mark as downloaded for this user (but don't store IP)
            await downloadRef.set({
                userId,
                gameId,
                timestamp: Timestamp.now()
            });
        } else {
            // For anonymous users, we don't store IP or track duplicates to preserve privacy.
            // We create a log entry with a random ID to record the event.
            const anonDownloadRef = adminDb.collection("downloads").doc();
            await anonDownloadRef.set({
                userId: null,
                gameId,
                timestamp: Timestamp.now()
            });
        }

        await gameRef.update({
            downloadCount: FieldValue.increment(1)
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing download count:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Check if a user has a specific permission
 */
export async function hasPermission(adminUid: string, collection: string, action: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE') {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();

        if (!userDoc.exists) return false;
        const userData = userDoc.data();

        // Owner has all permissions
        if (userData?.isOwner) return true;

        // Check for assigned rule
        const ruleId = userData?.ruleId;
        if (!ruleId) return false;

        const ruleDoc = await adminDb.collection("account_rules").doc(ruleId).get();
        if (!ruleDoc.exists) return false;

        const ruleData = ruleDoc.data();
        const permissions = ruleData?.rules?.[collection] || [];

        return permissions.includes(action);
    } catch (err) {
        console.error("Permission check error:", err);
        return false;
    }
}

/**
 * Server Action: Create or Update an account rule (Owner only)
 */
export async function upsertAccountRule(adminUid: string, ruleData: { id?: string, title: string, description: string, rules: Record<string, string[]> }) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Only the owner can manage rules." };
        }

        const { id, ...data } = ruleData;
        const ruleRef = id ? adminDb.collection("account_rules").doc(id) : adminDb.collection("account_rules").doc();

        const payload: any = {
            ...data,
            last_update: Timestamp.now(),
        };
        if (!id) {
            payload.created = Timestamp.now();
        }

        await ruleRef.set(payload, { merge: true });

        return { success: true, id: ruleRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Assign a rule to a user (Owner only)
 */
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

/**
 * Server Action: Fetch all rules
 */
export async function getAccountRules(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || (!userDoc.data()?.isOwner && !userDoc.data()?.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        const snapshot = await adminDb.collection("account_rules").get();
        const rules = snapshot.docs.map((doc: any) => {
            const data = doc.data() as any;
            return {
                id: doc.id,
                ...data,
                last_update: data.last_update?.toDate ? data.last_update.toDate().toISOString() : data.last_update,
                created: data.created?.toDate ? data.created.toDate().toISOString() : data.created
            };
        });
        return { success: true, rules };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Delete an account rule (Owner only)
 */
export async function deleteAccountRule(adminUid: string, ruleId: string) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        await adminDb.collection("account_rules").doc(ruleId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Get current user's permissions
 */
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

/**
 * Server Action: Cleanup expired offers with zero sales
 */
export async function cleanupExpiredOffers(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || (!adminDoc.data()?.isOwner && !adminDoc.data()?.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        // 1. Get all offers
        const offersSnap = await adminDb.collection("offers").get();
        const now = new Date();

        const expiredOffers = offersSnap.docs.filter((doc: any) => {
            const data = doc.data();
            const expireDate = data.expire?.toDate ? data.expire.toDate() : new Date(data.expire);
            return expireDate < now;
        });

        if (expiredOffers.length === 0) {
            return { success: true, count: 0, message: "No expired offers found." };
        }

        // 2. Identify which expired offers have sales
        const soldOfferIds = new Set<string>();
        const purchasesSnap = await adminDb.collectionGroup("offers").get();

        purchasesSnap.forEach((doc: any) => {
            // We only want documents from 'accounts/{uid}/offers' subcollections, 
            // not the root 'offers' collection itself.
            if (doc.ref.path.includes("accounts/")) {
                soldOfferIds.add(doc.id);
            }
        });

        // 3. Delete those that are expired AND have no sales
        let deletedCount = 0;
        const batch = adminDb.batch();

        for (const offerDoc of expiredOffers) {
            if (!soldOfferIds.has(offerDoc.id)) {
                batch.delete(offerDoc.ref);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            await batch.commit();
        }

        return { success: true, count: deletedCount, message: `Cleaned up ${deletedCount} expired and unsold offers.` };
    } catch (error: any) {
        console.error("Error cleaning up offers:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update a game (Admin only)
 */
export async function updateGame(adminUid: string, gameId: string, gameData: any) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canUpdate = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'games', 'UPDATE'));

        if (!userDoc.exists || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        const gameRef = adminDb.collection("games").doc(gameId);
        const { gameId: _, image, slug, ...cleanedData } = gameData;

        await gameRef.update({
            ...cleanedData,
            updatedAt: Timestamp.now()
        });

        try {
            revalidatePath('/games');
            revalidatePath('/');
        } catch (e) {}

        return { success: true };
    } catch (error: any) {
        console.error("Error updating game:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Update an offer (Admin only)
 */
export async function updateOffer(adminUid: string, offerId: string, offerData: any) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canUpdate = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'offers', 'UPDATE'));

        if (!adminDoc.exists || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        const offerRef = adminDb.collection("offers").doc(offerId);

        const payload: any = {
            ...offerData,
        };

        if (offerData.originalPrice !== undefined) {
            payload.originalPrice = Number(offerData.originalPrice);
        }
        if (offerData.quantity !== undefined) {
            payload.quantity = Number(offerData.quantity);
        }
        if (offerData.targetXP !== undefined) {
            payload.targetXP = Number(offerData.targetXP);
        } else if (offerData.targetAffiliates !== undefined) {
            payload.targetXP = Number(offerData.targetAffiliates);
        }

        if (offerData.expire) {
            payload.expire = Timestamp.fromDate(new Date(offerData.expire));
        }

        // Remove listed to avoid overwriting it
        delete payload.listed;

        await offerRef.update(payload);
        return { success: true };
    } catch (error: any) {
        console.error("Error updating offer:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Fetch all reward levels
 */
export async function getRewardLevels() {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("reward_levels").orderBy("min_xp", "asc").get();
        return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as RewardLevel[];
    } catch (err: any) {
        return [];
    }
}

/**
 * Server Action: Save/Update affiliate level (Owner only)
 */
export async function saveRewardLevel(adminUid: string, levelData: any) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        const { id, ...data } = levelData;
        const levelRef = id ? adminDb.collection("reward_levels").doc(id) : adminDb.collection("reward_levels").doc();
        await levelRef.set(data, { merge: true });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Server Action: Delete affiliate level (Owner only)
 */
export async function deleteRewardLevel(adminUid: string, levelId: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        await adminDb.collection("reward_levels").doc(levelId).delete();
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}


/**
 * Server Action: Update user's reward level based on XP
 */
export async function updateUserLevel(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return;

        const userData = userDoc.data()!;
        const currentXP = userData.xp ?? userData.discount ?? 0; // Support both fields during transition

        const levelsSnap = await adminDb.collection("reward_levels").orderBy("min_xp", "desc").get();
        let newLevel = "starter";

        for (const d of levelsSnap.docs) {
            const level = d.data();
            if (currentXP >= (level.min_xp || 0)) {
                newLevel = level.title;
                break; // Found the highest level
            }
        }


        await userRef.update({ affiliateLevel: newLevel });
    } catch (err) { }
}

/**
 * Server Action: Add reward XP to an inviter
 */
export async function addAffiliateReward(inviterUid: string, amount: number, type: 'onetime' | 'commission') {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(inviterUid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "Inviter not found." };

        const userData = userDoc.data()!;
        const currentLevelTitle = userData.affiliateLevel || "starter";

        // Fetch level config
        const levelsSnap = await adminDb.collection("reward_levels").where("title", "==", currentLevelTitle).get();
        const levelData = levelsSnap.docs[0]?.data();
        const commPercent = levelData?.payment_commision || 2;

        let rewardXP = 0;
        if (type === 'onetime') {
            rewardXP = levelData?.onetime_reward_xp || 5;
        } else {
            // commission based on payment amount
            rewardXP = Math.ceil((amount * commPercent) / 100);
        }

        console.log(`[AffiliateReward] User: ${inviterUid}, Level: ${currentLevelTitle}, Reward: ${rewardXP} XP, Type: ${type}`);

        if (rewardXP > 0) {
            await userRef.update({
                xp: FieldValue.increment(rewardXP),
                discount: FieldValue.increment(rewardXP) // Keep syncing to discount for now just in case
            });


            // Log history
            await userRef.collection("reward_history").add({
                type: type,
                rewardXP: rewardXP,
                amount: amount,
                timestamp: Timestamp.now()
            });

            // Log to unified activity
            await userRef.collection("activity").add({
                type: 'gain',
                subType: type === 'onetime' ? 'referral' : 'commission',
                xp: rewardXP,
                title: type === 'onetime' ? 'New Recruit Reward' : 'Mission Commission',
                details: type === 'onetime' ? 'Successfully recruited a new agent.' : `Earned commission from a recruit's purchase.`,
                date: Timestamp.now()
            });

            // Update level after getting XP
            await updateUserLevel(inviterUid);

        }

        return { success: true };
    } catch (err: any) {
        console.error("Error adding affiliate reward:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Server Action: Invest XP into an offer
 */
export async function investXP(uid: string, offerId: string, xp: number) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "User not found." };

        const userData = userDoc.data()!;
        const currentXP = userData.xp ?? userData.discount ?? 0;
        if (currentXP < xp) {

            return { success: false, error: "Insufficient XP." };
        }

        // Check if goal reached

        const offerRef = adminDb.collection("offers").doc(offerId);
        const offerDoc = await offerRef.get();
        const offerData = offerDoc.data();
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || offerData.targetAffiliates || 10);
        let currentProgress = 0;

        if (offerData.offerScope === 'global') {
            // Global: community-wide progress
            const investmentsSnap = await offerRef.collection("investments").get();
            investmentsSnap.forEach((d: any) => currentProgress += Number(d.data().xp || 0));
        } else {
            // Local: individual user progress
            const userOfferDoc = await userRef.collection("offers").doc(offerId).get();
            if (userOfferDoc.exists) {
                currentProgress = userOfferDoc.data()?.investedXP || 0;
            }
        }

        if (currentProgress >= targetXP) {
            return { success: false, error: "Goal already reached! Investment failed." };
        }


        // Subtract XP

        await userRef.update({
            xp: FieldValue.increment(-xp),
            discount: FieldValue.increment(-xp)
        });

        // Add to user's offer record
        await userRef.collection("offers").doc(offerId).set({
            offerId: offerId,
            investedXP: FieldValue.increment(xp),
            lastInvested: Timestamp.now(),
            status: "investing"
        }, { merge: true });


        // Add to global offer investments (using add() for separate records)
        await adminDb.collection("offers").doc(offerId).collection("investments").add({
            uid: uid,
            xp: xp,
            datetime: Timestamp.now(),
            email: userData.email,
            name: userData.name,
            photoURL: userData.photoURL
        });

        // Log to unified activity
        await userRef.collection("activity").add({
            type: 'spent',
            subType: 'investment',
            xp: -xp,
            title: `Invested in ${offerData.title}`,
            details: `Committed XP to help reach the giveaway goal.`,
            date: Timestamp.now(),
            offerId: offerId
        });




        // Update level after spending points
        await updateUserLevel(uid);

        return { success: true };
    } catch (err: any) {
        console.error("Error investing XP:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Server Action: Get unified user activity (Affiliates, Investments, Refunds)
 */
export async function getUserActivity(uid: string) {

    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);

        // 1. Fetch from unified activity collection
        const activitySnap = await userRef.collection("activity").orderBy("date", "desc").limit(50).get();
        const activity: any[] = activitySnap.docs.map((d: any) => ({
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


/**
 * Server Action: Return XP to users who didn't win (Admin only)
 */
export async function returnGameXP(adminUid: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.data()?.isOwner && !adminDoc.data()?.ruleId) {
            return { success: false, error: "Unauthorized." };
        }

        const offerRef = adminDb.collection("offers").doc(offerId);
        const investmentsSnap = await offerRef.collection("investments").get();

        if (investmentsSnap.empty) return { success: true, message: "No investments to return." };

        // Aggregate by user to find the winner
        const userXPMap: { [uid: string]: number } = {};
        investmentsSnap.forEach((d: any) => {
            const data = d.data();
            const uid = data.uid;
            if (!uid) return;
            const xp = Number(data.xp || 0);
            userXPMap[uid] = (userXPMap[uid] || 0) + xp;
        });

        // Find winner (uid with most XP)
        let winnerUid = "";
        let maxXP = -1;
        for (const [uid, xp] of Object.entries(userXPMap)) {
            if (xp > maxXP) {
                maxXP = xp;
                winnerUid = uid;
            }
        }

        const offerDoc = await offerRef.get();
        const offerData = offerDoc.data();
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || 10);

        let currentTotal = 0;
        investmentsSnap.forEach((d: any) => currentTotal += Number(d.data().xp || 0));

        // If goal not reached, no one is a winner, return to everyone
        const goalReached = currentTotal >= targetXP;
        const actualWinner = goalReached ? winnerUid : null;

        let returnCount = 0;
        for (const d of investmentsSnap.docs) {
            const data = d.data();
            if (data.isReturned) continue;
            if (actualWinner && data.uid === actualWinner) continue; // Winner doesn't get XP back


            const xpToReturn = Number(data.xp || 0);
            if (xpToReturn <= 0) continue;

            const userRef = adminDb.collection("accounts").doc(data.uid);

            // Return XP to user
            try {
                await userRef.update({
                    xp: FieldValue.increment(xpToReturn),
                    discount: FieldValue.increment(xpToReturn)
                });

                // Log to unified activity
                await userRef.collection("activity").add({
                    type: 'gain',
                    subType: 'refund',
                    xp: xpToReturn,
                    title: `XP Returned`,
                    details: `Refunded XP for unreached goal or lost challenge.`,
                    date: Timestamp.now(),
                    offerId: offerId
                });

                // Mark as returned
                await d.ref.update({ isReturned: true });
                returnCount++;
            } catch (uErr) {
                console.error(`Failed to return XP to user ${data.uid}:`, uErr);
            }

        }

        return { success: true, message: `Successfully returned XP for ${returnCount} investments. Winner UID: ${winnerUid}.` };
    } catch (err: any) {
        console.error("Error returning XP:", err);
        return { success: false, error: err.message };
    }
}

/**
 * SUPPORT CHAT ACTIONS (MongoDB Backed)
 */

export async function getSupportChats(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || (!adminDoc.data()?.isOwner && !adminDoc.data()?.ruleId)) {
            return { success: false, error: "Unauthorized" };
        }

        const snapshot = await adminDb.collection("support_chats").orderBy("updatedAt", "desc").get();
        return { 
            success: true, 
            chats: snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSupportMessages(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("support_messages")
            .where("chatId", "==", uid)
            .orderBy("timestamp", "asc")
            .get();
        
        return { 
            success: true, 
            messages: snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendSupportMessage(uid: string, messageData: { text: string, senderId: string, senderName: string }) {
    try {
        const adminDb = await getAdminDb();
        
        // 1. Add message
        await adminDb.collection("support_messages").add({
            ...messageData,
            chatId: uid,
            timestamp: Date.now()
        });

        // 2. Update chat metadata
        const chatRef = adminDb.collection("support_chats").doc(uid);
        const chatDoc = await chatRef.get();
        
        const updateData: any = {
            lastMessage: messageData.text,
            updatedAt: Date.now(),
        };

        if (!chatDoc.exists) {
            updateData.id = uid;
            updateData.name = messageData.senderName;
            updateData.status = 'open';
            updateData.createdAt = Date.now();
            await chatRef.set(updateData);
        } else {
            await chatRef.update(updateData);
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignChat(adminUid: string, adminName: string, chatId: string) {
    try {
        const adminDb = await getAdminDb();
        await adminDb.collection("support_chats").doc(chatId).update({
            ownerId: adminUid,
            ownerName: adminName,
            status: 'active'
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUserPurchasedOffers(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const paymentsSnap = await adminDb.collection("accounts").doc(uid).collection("payments").get();
        const offersSnap = await adminDb.collection("accounts").doc(uid).collection("offers").get();

        const dict: { [key: string]: any } = {};
        paymentsSnap.forEach((d: any) => {
            const data = d.data();
            if (data.offerId) dict[data.offerId] = data;
        });
        offersSnap.forEach((d: any) => {
            dict[d.id] = d.data();
        });

        return { success: true, purchasedOffers: dict };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


