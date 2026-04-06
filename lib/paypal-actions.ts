"use server";

import { getAdminDb } from './firebase-admin';

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
export async function capturePayPalOrder(orderID: string, uid: string, game: string, amount: string, couponCode?: string, offerId?: string) {
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

            // If it's a limited offer purchase, decrement its quantity
            if (offerId) {
                const offerRef = adminDb.collection("offers").doc(offerId);
                const offerDoc = await offerRef.get();
                if (offerDoc.exists) {
                    await offerRef.update({
                        quantity: FieldValue.increment(-1)
                    });
                }
            }

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

            const { encrypt } = await import('./crypto');

            // Securely store in Firebase using Admin SDK
            await adminDb.collection("accounts").doc(uid).collection("payments").doc(orderID).set({
                game: game,
                purchaseDate: Timestamp.now(),
                coupon: couponUsed,
                amount: amount,
                activation: "permanent",
                status: "COMPLETED",
                paypalOrderId: orderID,
                payerEmail: encrypt(details.payer?.email_address || "unknown"),
                payerName: encrypt(details.payer ? `${details.payer.name.given_name} ${details.payer.name.surname}` : "unknown"),
                // Unified Offers Logic
                offerId: offerId || null,
                offerStatus: offerId ? false : null,
                steamKey: null // To be filled by admin later
            });

            return { success: true };
        }

        return { success: false, error: "Payment was not COMPLETED." };
    } catch (error: any) {
        console.error("PayPal Capture Order Error:", error);
        return { success: false, error: error.message };
    }
}
