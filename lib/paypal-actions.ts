"use server";

/**
 * PayPal Payment Processing Actions
 */

import { getAdminDb } from './firebase-admin';
import { addAffiliateReward } from './admin-actions';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET?.trim();

/**
 * Must match the environment of NEXT_PUBLIC_PAYPAL_CLIENT_ID (sandbox vs live).
 * - sandbox → https://api-m.sandbox.paypal.com
 * - live → https://api-m.paypal.com
 */
// Production deploys should use live API + live credentials. Override with PAYPAL_ENV=sandbox for staging.
const PAYPAL_ENV = (
    process.env.PAYPAL_ENV ||
    process.env.NEXT_PUBLIC_PAYPAL_ENV ||
    (process.env.NODE_ENV === "production" ? "live" : "sandbox")
).toLowerCase();
const PAYPAL_BASE_URL =
    PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
console.log(PAYPAL_BASE_URL, "PAYPAL_BASE_URL");
function verifyPayPalCapturePayload(details: any, expectedAmountStr: string): { ok: true } | { ok: false; error: string } {
    if (!details || details.status !== "COMPLETED") {
        return { ok: false, error: "PayPal order is not COMPLETED." };
    }
    const units = details.purchase_units;
    if (!Array.isArray(units) || units.length === 0) {
        return { ok: false, error: "Invalid PayPal response: missing purchase units." };
    }
    const captures = units[0]?.payments?.captures;
    if (!Array.isArray(captures) || captures.length === 0) {
        return { ok: false, error: "PayPal did not complete a money capture. No funds were taken." };
    }
    const primary = captures[0];
    if (primary.status !== "COMPLETED") {
        return { ok: false, error: `PayPal capture not completed (status: ${primary.status}).` };
    }
    const capturedVal = parseFloat(String(primary.amount?.value ?? "0"));
    const expected = parseFloat(String(expectedAmountStr ?? "0"));
    if (Number.isNaN(expected) || expected < 0) {
        return { ok: false, error: "Invalid expected amount." };
    }
    // Allow small float drift (PayPal uses 2 decimal places)
    if (Math.abs(capturedVal - expected) > 0.02) {
        return {
            ok: false,
            error: `PayPal captured $${capturedVal.toFixed(2)} but expected $${expected.toFixed(2)}. Payment not recorded.`,
        };
    }
    return { ok: true };
}
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
export async function capturePayPalOrder(orderID: string, uid: string, game: string, amount: string, couponCode?: string, offerId?: string, gameId?: string | number) {
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
                const msg =
                    captureDetails?.message ||
                    captureDetails?.details?.[0]?.description ||
                    captureDetails?.name ||
                    "Failed to capture PayPal order";
                throw new Error(msg);
            }
            details = captureDetails;

            const verified = verifyPayPalCapturePayload(details, amount);
            if (!verified.ok) {
                console.error("PayPal capture verification failed:", verified.error, { orderID });
                throw new Error(verified.error);
            }
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

            const paymentData: any = {
                game: game,
                gameId: gameId || "",
                purchaseDate: Timestamp.now(),
                coupon: couponUsed,
                amount: amount,
                activation: "permanent",
                status: "COMPLETED",
                paypalOrderId: orderID,
                payerEmail: encrypt(details.payer?.email_address || "unknown"),
                payerName: encrypt(
                    details.payer?.name 
                    ? `${details.payer.name.given_name || ""} ${details.payer.name.surname || ""}`.trim() || "unknown" 
                    : "unknown"
                ),
            };

            const userRef = adminDb.collection("accounts").doc(uid);

            if (offerId) {
                // Limited Offer: Store in 'offers' subcollection with offerId as doc ID
                await userRef.collection("offers").doc(offerId).set(paymentData);
            } else {
            // Standard Payment: Store in 'payments' subcollection with orderID as doc ID
                await userRef.collection("payments").doc(orderID).set(paymentData);
            }

            // Affiliate Commission Logic
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            if (userData?.referredBy) {
                const inviterQuery = await adminDb.collection("accounts").where("affiliateId", "==", userData.referredBy).limit(1).get();
                if (!inviterQuery.empty) {
                    const inviterUid = inviterQuery.docs[0].id;
                    console.log(`[PayPal] Triggering affiliate reward for ${inviterUid} from user ${uid}`);
                    await addAffiliateReward(inviterUid, parseFloat(amount), 'commission');
                }
            }

            // Payment recorded successfully
            return { success: true };
        }

        return { success: false, error: "Payment was not COMPLETED." };
    } catch (error: any) {
        console.error("PayPal Capture Order Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Read PayPal available balance (Admin only)
 */
export async function getPayPalBalance(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        let totalAmount = 0;

        // Double checking the system: Aggregate all purchases to calculate real balance
        const accountsSnap = await adminDb.collection("accounts").get();
        const promises = accountsSnap.docs.map(async (accountDoc) => {
            const userRef = adminDb.collection("accounts").doc(accountDoc.id);
            const [paymentsSnap, offersSnap] = await Promise.all([
                userRef.collection("payments").where("status", "==", "COMPLETED").get(),
                userRef.collection("offers").where("status", "==", "COMPLETED").get()
            ]);

            paymentsSnap.forEach(doc => {
                const val = parseFloat(doc.data().amount);
                if (!isNaN(val)) totalAmount += val;
            });
            offersSnap.forEach(doc => {
                const val = parseFloat(doc.data().amount);
                if (!isNaN(val)) totalAmount += val;
            });
        });

        await Promise.all(promises);

        return { success: true, amount: totalAmount.toFixed(2), currency: "USD" };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to calculate system balance." };
    }
}
