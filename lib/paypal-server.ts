"use server";

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin safely for Server Side logic
 */
async function getAdminDb() {
    // Modular dynamic imports to solve Next.js constructor errors
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    const apps = getApps();
    if (!apps.length) {
        try {
            const projectId = process.env.FIREBASE_PROJECT_ID;
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

            if (!projectId || !clientEmail || !privateKey) {
                throw new Error("Missing Firebase Admin credentials in .env.local (Ensure they don't have NEXT_PUBLIC_ prefix)");
            }

            initializeApp({
                credential: cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log("Firebase Admin initialized securely.");
        } catch (error) {
            console.error("Firebase Admin initialization error:", error);
            throw error;
        }
    }
    return getFirestore();
}

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const PAYPAL_BASE_URL = process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/**
 * Get PayPal access token (Server Side Only)
 */
async function getAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || PAYPAL_CLIENT_SECRET === "YOUR_SECRET_HERE") {
        throw new Error("PayPal Secret is missing or invalid in .env.local.");
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (!response.ok) {
        throw new Error("PayPal Authentication failed. Check your Secret Key in .env.local");
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Server Action: Capture a PayPal order and store in Firebase
 */
export async function capturePayPalOrder(orderID: string, uid: string, game: string, amount: string, couponCode?: string) {
    try {
        let details: any = { status: "COMPLETED" };

        // If it's a real PayPal order, capture it. Otherwise skip to Firebase part.
        if (!orderID.startsWith("FREE_CLAIM_")) {
            console.log(`Processing PayPal Capture for Order: ${orderID}`);
            const accessToken = await getAccessToken();
            const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const captureDetails = await response.json();
            if (!response.ok) {
                console.error("PayPal Capture Error Detail:", captureDetails);
                throw new Error(captureDetails.message || "Failed to capture PayPal order");
            }
            details = captureDetails;
        } else {
            console.log(`Processing Free Claim: ${game}`);
            details = { 
                status: "COMPLETED", 
                payer: { 
                    email_address: "free-tier@crackorigins.com",
                    name: { given_name: "Crack", surname: "Origins User" }
                } 
            };
        }

        if (details.status === "COMPLETED") {
            const adminDb = await getAdminDb();
            const { Timestamp, FieldValue } = await import('firebase-admin/firestore');

            // If coupon was used, decrement its quantity
            let couponUsed = couponCode || "null";
            if (couponCode && couponCode !== "null") {
                const couponRef = adminDb.collection("coupons").doc(couponCode);
                const couponDoc = await couponRef.get();
                if (couponDoc.exists) {
                    await couponRef.update({
                        quantity: FieldValue.increment(-1)
                    });
                } else {
                    couponUsed = "invalid-or-not-found";
                }
            }

            // Securely store in Firebase using Admin SDK
            await adminDb.collection("accounts").doc(uid).collection("payments").doc(orderID).set({
                game: game,
                purchaseDate: Timestamp.now(),
                coupon: couponUsed,
                amount: amount,
                activation: "permanent",
                status: "COMPLETED",
                paypalOrderId: orderID,
                payerEmail: details.payer?.email_address || "unknown",
                payerName: details.payer ? `${details.payer.name.given_name} ${details.payer.name.surname}` : "unknown",
            });

            return { success: true };
        }

        return { success: false, error: "Payment was not COMPLETED." };
    } catch (error: any) {
        console.error("PayPal Capture Order Error:", error);
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
}) {
    try {
        const adminDb = await getAdminDb();
        await adminDb.collection("accounts").doc(uid).set({
            isOwner: data.isOwner,
            name: data.name,
            email: data.email,
            photoURL: data.photoURL,
            created: data.created || null,
            last: data.last || null,
            updatedAt: Timestamp.now(),
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error syncing user record (Server):", error);
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

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.game) {
                games.push(data.game);
                details[data.game] = {
                    activationKey: doc.id,
                    purchaseDate: data.purchaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
                    amount: data.amount,
                    status: data.status,
                    payerEmail: data.payerEmail,
                };
            }
        });

        return { success: true, games, details };
    } catch (error: any) {
        console.error("Error fetching owned games (Server):", error);
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

        if (!couponDoc.exists) {
            return { success: false, error: "Invalid coupon code." };
        }

        const data = couponDoc.data();
        if (!data) return { success: false, error: "Coupon data not found." };

        // Check if explicitly marked as expired
        if (data.isExpired === true) {
            return { success: false, error: "This coupon has expired." };
        }

        // Check quantity
        if (data.quantity <= 0) {
            return { success: false, error: "This coupon is no longer available." };
        }

        // Check expiration date
        if (data.expire) {
            const expireDate = new Date(data.expire);
            // If it's a date string like 'YYYY-MM-DD', make it end of day
            if (data.expire.length <= 10) {
                expireDate.setHours(23, 59, 59, 999);
            }
            const now = new Date();
            if (expireDate < now) {
                return { success: false, error: "This coupon has expired." };
            }
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
        
        // 1. Verify if user is actually an owner
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized. Admin privileges required." };
        }

        // 2. Generate a random coupon code (ID)
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let couponCode = '';
        const codeLength = 16;
        for (let i = 0; i < codeLength; i++) {
            couponCode += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // 3. Create document in 'coupons' collection
        await adminDb.collection("coupons").doc(couponCode).set({
            name: couponData.name,
            discount: couponData.discount,
            quantity: couponData.quantity,
            expire: couponData.expire,
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
        const doc = await adminDb.collection("accounts").doc(uid).get();
        return { success: true, isOwner: doc.data()?.isOwner === true };
    } catch (err) {
        return { success: false, isOwner: false };
    }
}
