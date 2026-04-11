import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, secret: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
        console.error("LEMONSQUEEZY_WEBHOOK_SECRET is not set");
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const rawBody = await request.text();
    const sig = request.headers.get("x-signature");
    
    // Log for debugging (remove in production if body is large)
    console.log("Lemon Squeezy Webhook received. Signature:", sig);

    if (!verifySignature(rawBody, secret, sig)) {
        console.error("Lemon Squeezy Webhook: Invalid Signature.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: {
        meta?: {
            event_name?: string;
            custom_data?: Record<string, unknown>;
        };
        data?: {
            type?: string;
            id?: string;
            attributes?: {
                status?: string;
                total?: number;
                total_usd?: number;
                user_email?: string;
                identifier?: string;
            };
        };
    };

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventName = request.headers.get("x-event-name") || payload.meta?.event_name;
    if (eventName !== "order_created") {
        return NextResponse.json({ ok: true, ignored: eventName });
    }

    if (payload.data?.type !== "orders") {
        return NextResponse.json({ ok: true });
    }

    // Diagnostic log for the whole payload in dev
    console.log("Lemon Squeezy Webhook Payload:", JSON.stringify(payload, null, 2));

    const attrs = payload.data.attributes;
    if (attrs?.status !== "paid") {
        console.log("Lemon webhook: ignoring because status is", attrs?.status);
        return NextResponse.json({ ok: true, ignored: "not_paid" });
    }

    const custom = payload.meta?.custom_data ?? {};
    const offerId = typeof custom.offer_id === "string" ? custom.offer_id : "";
    const userUid = typeof custom.user_uid === "string" ? custom.user_uid : "";
    const orderId = payload.data.id;

    if (!offerId || !userUid || !orderId) {
        console.warn("Lemon webhook: missing custom_data or order id. Custom:", custom, "OrderID:", orderId);
        return NextResponse.json({ ok: true });
    }

    const adminDb = await getAdminDb();
    const { Timestamp, FieldValue } = await import("firebase-admin/firestore");
    const processedRef = adminDb.collection("lemonsqueezy_processed_orders").doc(String(orderId));
    const offerRef = adminDb.collection("offers").doc(offerId);
    const userRef = adminDb.collection("accounts").doc(userUid);
    const userOfferRef = userRef.collection("offers").doc(offerId);

    // Lemon Squeezy 'total' is in cents
    const totalCents = Number(attrs?.total || 0);
    const amountUsd = (totalCents / 100).toFixed(2);
    console.log(`Processing order ${orderId} for User ${userUid}, Offer ${offerId}, Amount ${amountUsd}`);

    try {
        await adminDb.runTransaction(async (t) => {
            const processedSnap = await t.get(processedRef);
            if (processedSnap.exists) return;

            const offerSnap = await t.get(offerRef);
            if (!offerSnap.exists) {
                t.set(processedRef, { processedAt: Timestamp.now(), note: "missing_offer" });
                return;
            }
            const gameTitle = String(offerSnap.data()?.title ?? offerId);

            const existingUserOffer = await t.get(userOfferRef);
            if (existingUserOffer.exists) {
                t.set(processedRef, { processedAt: Timestamp.now(), note: "already_owned" });
                return;
            }

            const paymentData: Record<string, unknown> = {
                game: gameTitle,
                purchaseDate: Timestamp.now(),
                coupon: "null",
                amount: amountUsd,
                activation: "permanent",
                status: "COMPLETED",
                txHash: `LEMON_${orderId}`,
                network: "LEMON_SQUEEZY",
                method: "lemonsqueezy",
                lemonOrderId: String(orderId),
                lemonOrderIdentifier: attrs.identifier ?? null,
                payerEmail: attrs.user_email ?? null,
            };

            t.update(offerRef, { quantity: FieldValue.increment(-1) });
            t.set(userOfferRef, paymentData);
            t.set(processedRef, { processedAt: Timestamp.now() });
        });
    } catch (e) {
        console.error("Lemon webhook fulfillment error:", e);
        return NextResponse.json({ error: "Fulfillment failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
