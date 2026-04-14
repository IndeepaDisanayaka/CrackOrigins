"use server";

import { getAdminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { encrypt, decrypt } from './crypto';
import { getBlogPosts } from './blog';

/**
 * Server Action: Generate a unique 3-digit Game ID
 */
export async function generateUniqueGameId() {
    try {
        const adminDb = await getAdminDb();
        let gameId = 0;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 100) {
            gameId = Math.floor(100 + Math.random() * 900); // Generates 100-999
            const existing = await adminDb.collection("games").where("gameId", "==", gameId).limit(1).get();
            if (existing.empty) isUnique = true;
            attempts++;
        }
        
        if (!isUnique) throw new Error("Could not generate a unique ID. Registry may be full.");
        
        return { success: true, gameId };
    } catch (error: any) {
        console.error("Error generating game ID:", error);
        return { success: false, error: error.message };
    }
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

        // Check for unique gameId again before saving by checking if document ID exists
        if (gameData.gameId) {
            const gameIdStr = String(gameData.gameId);
            const existing = await adminDb.collection("games").doc(gameIdStr).get();
            if (existing.exists) {
                return { success: false, error: `Game ID ${gameIdStr} already exists. Please choose a different ID.` };
            }
        }

        const gameIdStr = String(gameData.gameId);
        const gameRef = adminDb.collection("games").doc(gameIdStr);
        
        // Remove redundant keys from the data object as requested
        const { gameId, image, ...cleanedData } = gameData;
        
        await gameRef.set({
            ...cleanedData,
            time: Timestamp.now(),
        });

        return { success: true, id: gameIdStr };
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
        const games = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                // Ensure the fields match the component's expectations and the Firestore structure
                id: doc.id,
                gameId: data.gameId || doc.id, // Use doc.id as fallback if data.gameId is excluded
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
                downloadUrl: data.downloadUrl || "" // Google Drive direct link
            };
        });
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
            country: data.country || "Unknown"
        };

        // Only insert referredBy if it has a value (not null/undefined)
        if (referredBy) {
            userPayload.referredBy = referredBy;
        }

        await userRef.set(userPayload, { merge: true });

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
        return { 
            success: true, 
            isOwner: data?.isOwner === true,
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

        // Users
        const accountsSnap = await adminDb.collection("accounts").get();
        const users = accountsSnap.docs.map(d => {
            const data = d.data() || {};
            let decryptedEmail = data.email || null;
            if (typeof decryptedEmail === 'string' && decryptedEmail.includes(':')) {
                try { decryptedEmail = decrypt(decryptedEmail); } catch { }
            }
            return {
                uid: d.id,
                name: data.name || null,
                email: decryptedEmail,
                photoURL: data.photoURL || null,
                isOwner: data.isOwner === true,
                country: data.country || "Unknown",
            };
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

        const fs = await import('fs');
        const path = await import('path');
        const blogPath = path.join(process.cwd(), 'content/blog', `${slug}.md`);

        if (fs.existsSync(blogPath)) {
            fs.unlinkSync(blogPath);
            return { success: true };
        }
        return { success: false, error: "Post file not found." };
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

