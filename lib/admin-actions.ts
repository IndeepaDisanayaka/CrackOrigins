"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { encrypt, decrypt } from './crypto';
import { getBlogPosts } from './blog';

/**
 * Server Action: Generate a unique slug from title
 */
export async function generateGameSlug(title: string) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function toIsoDate(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
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
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        const gameRef = adminDb.collection("games").doc(); // Use auto-generated ID
        
        // Remove redundant keys from the data object - stop saving slug as requested
        const { gameId, image, ...cleanedData } = gameData;
        
        await gameRef.set({
            ...cleanedData,
            time: Timestamp.now(),
        });

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
        const games = await Promise.all(snapshot.docs.map(async (doc) => {
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
                downloadUrl: data.downloadUrl || "",
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
                const inviterRef = inviterQuery.docs[0].ref;
                const { FieldValue } = await import('firebase-admin/firestore');
                
                await inviterRef.collection("affiliates").doc(uid).set({
                    uid: uid,
                    date: Timestamp.now(),
                    location: data.country || "Unknown"
                });

                await inviterRef.update({
                    discount: FieldValue.increment(5)
                });

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
            discount,
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
                    try { decryptedEmail = decrypt(decryptedEmail); } catch(e) {}
                }

                details[data.game] = {
                    activationKey: doc.id,
                    purchaseDate: data.purchaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
                    amount: data.amount,
                    status: data.status,
                    payerEmail: decryptedEmail,
                    isOffer
                };
            }
        };

        paymentsSnap.forEach(doc => processDoc(doc));
        offersSnap.forEach(doc => processDoc(doc, true));

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

        // Sync to RTDB for security rules during status check (covers existing users)
        try {
            const rtdb = await getAdminRtdb();
            await rtdb.ref(`accounts/${uid}/isOwner`).set(isOwner);
        } catch (e) {}

        return { 
            success: true, 
            isOwner: isOwner,
            affiliateId: data?.affiliateId || null,
            discount: data?.discount || 0,
            affiliateCount: affiliatesSnapshot.size
        };
    } catch (err) {
        return { success: false, isOwner: false, affiliateCount: 0 };
    }
}

/**
 * Server Action: Get admin dashboard data (Owner only)
 */
export async function getAdminDashboardData(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        // 1. Fetch Firestore users
        const accountsSnap = await adminDb.collection("accounts").get();
        const firestoreUsersMap = new Map();
        
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
            });
        });

        // 2. Fetch Auth users
        await ensureFirebaseAdminInitialized();
        const { getAuth } = await import('firebase-admin/auth');
        const authUsersResult = await getAuth().listUsers(1000);
        
        const users: any[] = [];
        const seenUids = new Set();

        authUsersResult.users.forEach(authUser => {
            const fsUser = firestoreUsersMap.get(authUser.uid);
            users.push({
                uid: authUser.uid,
                name: fsUser?.name || authUser.displayName || null,
                email: fsUser?.email || authUser.email || (authUser.providerData.length === 0 ? "anonymous" : null),
                photoURL: fsUser?.photoURL || authUser.photoURL || null,
                isOwner: fsUser?.isOwner === true,
                country: fsUser?.country || "Unknown",
                lastLoginAt: authUser.metadata.lastSignInTime,
                createdAt: authUser.metadata.creationTime,
                isAnonymous: authUser.providerData.length === 0
            });
            seenUids.add(authUser.uid);
        });

        // Add Firestore users that might not have been in the Auth list (unlikely but safe)
        firestoreUsersMap.forEach((user, uid) => {
            if (!seenUids.has(uid)) {
                users.push(user);
            }
        });

        // Global Offers + Coupons
        const [offersSnap, couponsSnap] = await Promise.all([
            adminDb.collection("offers").get(),
            adminDb.collection("coupons").get(),
        ]);

        const offers = offersSnap.docs.map(d => {
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
                listed: toIsoDate(data.listed),
            };
        });

        const coupons = couponsSnap.docs.map(d => {
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

        // Payments across all users (subcollections)
        const payments: any[] = [];
        await Promise.all(
            accountsSnap.docs.map(async (accountDoc) => {
                const userId = accountDoc.id;
                const userRef = adminDb.collection("accounts").doc(userId);

                const [paymentsSnap, offersPurchSnap] = await Promise.all([
                    userRef.collection("payments").get(),
                    userRef.collection("offers").get(),
                ]);

                const pushPayment = (doc: any, source: "payment" | "offerPayment") => {
                    const data = doc.data() || {};
                    let decryptedEmail = data.payerEmail || "unknown";
                    if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                        try { decryptedEmail = decrypt(decryptedEmail); } catch { }
                    }
                    payments.push({
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

                paymentsSnap.forEach((doc) => pushPayment(doc, "payment"));
                offersPurchSnap.forEach((doc) => pushPayment(doc, "offerPayment"));
            })
        );

        // Sort newest first
        payments.sort((a, b) => (b.purchaseDate || "").localeCompare(a.purchaseDate || ""));

        return { success: true, data: { users, payments, offers, coupons } };
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
        const discountVal = data.discount || 0;
        if (discountVal <= 0) return { success: false, error: "No discount points." };

        const couponCode = `REF-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + 1);

        await adminDb.collection("coupons").doc(couponCode).set({
            name: `Affiliate Reward (${data.name})`,
            discount: `${discountVal}%`,
            quantity: 1,
            expire: expireDate.toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            isExpired: false,
            userId: uid
        });

        await userRef.update({ discount: 0 });
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
        snapshot.forEach(doc => {
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
    targetAffiliates?: number;
}) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }


        await adminDb.collection("offers").doc(offerData.id).set({
            ...offerData,
            originalPrice: Number(offerData.originalPrice),
            quantity: Number(offerData.quantity),
            expire: Timestamp.fromDate(new Date(offerData.expire)),
            listed: Timestamp.now(),
            targetAffiliates: Number(offerData.targetAffiliates || 10),
        });

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
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

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
        let offerDoc = await userRef.collection("offers").doc(offerId).get();
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

/**
 * Server Action: Get affiliate recruitment progress for a specific offer
 */
export async function getAffiliateProgress(uid: string, listedDateIso: string) {
    try {
        const adminDb = await getAdminDb();
        const { Timestamp } = await import('firebase-admin/firestore');
        
        const listedDate = new Date(listedDateIso);
        if (isNaN(listedDate.getTime())) return { success: true, count: 0 };

        const affiliatesRef = adminDb.collection("accounts").doc(uid).collection("affiliates");
        const q = affiliatesRef.where('date', '>=', Timestamp.fromDate(listedDate));
        const snapshot = await q.get();
        
        return { success: true, count: snapshot.size };
    } catch (error: any) {
        console.error("Error fetching affiliate progress:", error);
        return { success: false, error: error.message };
    }
}
/**
 * Server Action: Delete a blog post file (Owner only)
 */
export async function deleteBlogPost(adminUid: string, slug: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        // Find document by slug field since doc ID is now auto-generated
        const blogQuery = await adminDb.collection('blogs').where('slug', '==', slug).limit(1).get();
        
        if (blogQuery.empty) return { success: false, error: "Post not found." };
        
        const blogDoc = blogQuery.docs[0];
        const blogRef = blogDoc.ref;
        
        // Delete all contents in the sub-collection first
        const contentsSnapshot = await blogRef.collection('contents').get();
        const batch = adminDb.batch();
        contentsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        // Delete the main blog document
        batch.delete(blogRef);
        
        await batch.commit();
        
        try {
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/blog');
            revalidatePath(`/blog/${slug}`);
        } catch (e) {
            console.error('Revalidation failed:', e);
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting blog post from Firestore:", error);
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
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

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

/**
 * Server Action: Bulk delete anonymous users (Owner only)
 */
export async function deleteAnonymousUsers(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

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

        // Delete in chunks of 500
        let totalDeleted = 0;
        for (let i = 0; i < anonymousUids.length; i += 400) {
            const batch = adminDb.batch();
            const chunk = anonymousUids.slice(i, i + 400);
            for (const uid of chunk) {
                batch.delete(adminDb.collection("accounts").doc(uid));
                try { await getAuth().deleteUser(uid); } catch(e) {}
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
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

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
            
            if (!hasActivity) {
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

/**
 * Server Action: Get user support profile and transaction history
 */
export async function getUserSupportData(adminUid: string, targetUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

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

/**
 * Server Action: Fetch a single game by its slug (generated from title)
 */
export async function getGameBySlug(slug: string) {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("games").get();
        
        let targetDoc = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const generated = await generateGameSlug(data.title || "");
            
            if (generated === slug) {
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
            time: data.time?.toDate()?.toISOString() || new Date().toISOString(),
            downloadCount: data.downloadCount || 0
        };

        // Fetch updates
        const updatesSnap = await targetDoc.ref.collection("updates").orderBy("date", "desc").get();
        const updates = await Promise.all(updatesSnap.docs.map(async (u) => {
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
        const reviews = reviewsSnap.docs.map(r => ({ 
            id: r.id, 
            ...r.data(),
            time: r.data().time?.toDate()?.toISOString() || new Date().toISOString()
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
export async function incrementDownloadCount(gameId: string) {
    try {
        const adminDb = await getAdminDb();
        const gameRef = adminDb.collection("games").doc(gameId);
        
        const { FieldValue } = await import('firebase-admin/firestore');
        await gameRef.update({
            downloadCount: FieldValue.increment(1)
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing download count:", error);
        return { success: false, error: error.message };
    }
}
