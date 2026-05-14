"use server";

/**
 * PayPal Payment Processing Actions
 */

import { getMongoDb } from './mongodb';
import { addAffiliateReward } from './admin-actions/payments';
import { encrypt } from './crypto';

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
            const db = await getMongoDb();

            // If it's a limited offer purchase, decrement its quantity
            if (offerId) {
                // One-time claim validation for free offers
                if (amount === "0.00" || amount === "0") {
                    const existingClaim = await db.collection("account_offers").findOne({ userId: uid, offerId });
                    if (existingClaim) {
                        return { success: false, error: "You have already claimed this offer." };
                    }
                }

                await db.collection("offers").updateOne(
                    { _id: offerId as any },
                    { $inc: { quantity: -1 } }
                );
            }

            // If coupon was used, decrement its quantity
            let couponUsed = couponCode || "null";
            if (couponCode && couponCode !== "null") {
                const res = await db.collection("coupons").updateOne(
                    { _id: couponCode as any },
                    { $inc: { quantity: -1 } }
                );
                if (res.matchedCount === 0) {
                    couponUsed = "invalid-or-not-found";
                }
            }

            const isFreeClaim = amount === "0.00" || amount === "0";
            const userDocForEmail = await db.collection("accounts").findOne({ uid });

            const paymentData: any = {
                userId: uid,
                game: game,
                gameId: gameId || "",
                purchaseDate: new Date(),
                amount: amount,
                status: isFreeClaim ? "PENDING" : "COMPLETED",
            };

            if (isFreeClaim) {
                // For free claims, we use user's own email if available
                paymentData.payerEmail = userDocForEmail?.email || encrypt("free-tier@crackorigins.com");
            } else {
                paymentData.coupon = couponUsed;
                paymentData.activationKey = orderID;
                paymentData.activation = "permanent";
                paymentData.paypalOrderId = orderID;
                paymentData.payerEmail = encrypt(details.payer?.email_address || "unknown");
                paymentData.payerName = encrypt(
                    details.payer?.name 
                    ? `${details.payer.name.given_name || ""} ${details.payer.name.surname || ""}`.trim() || "unknown" 
                    : "unknown"
                );
            }

            if (offerId) {
                paymentData.offerId = offerId;
                await db.collection("account_offers").updateOne(
                    { _id: orderID as any, userId: uid },
                    { $set: paymentData },
                    { upsert: true }
                );
            } else {
                await db.collection("payments").updateOne(
                    { _id: orderID as any, userId: uid },
                    { $set: paymentData },
                    { upsert: true }
                );
            }

            // Affiliate Commission Logic
            const userDoc = await db.collection("accounts").findOne({ uid });
            if (userDoc?.referredBy) {
                const inviterDoc = await db.collection("accounts").findOne({ affiliateId: userDoc.referredBy });
                if (inviterDoc) {
                    console.log(`[PayPal] Triggering affiliate reward for ${inviterDoc.uid} from user ${uid}`);
                    await addAffiliateReward(inviterDoc.uid, parseFloat(amount), 'commission');
                }
            }

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
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!adminDoc || !adminDoc.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        let totalAmount = 0;

        const [payments, offers] = await Promise.all([
            db.collection("payments").find({ status: "COMPLETED" }).toArray(),
            db.collection("account_offers").find({ status: "COMPLETED" }).toArray()
        ]);

        payments.forEach(doc => {
            const val = parseFloat(doc.amount);
            if (!isNaN(val)) totalAmount += val;
        });
        
        offers.forEach(doc => {
            const val = parseFloat(doc.amount);
            if (!isNaN(val)) totalAmount += val;
        });

        return { success: true, amount: totalAmount.toFixed(2), currency: "USD" };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to calculate system balance." };
    }
}
