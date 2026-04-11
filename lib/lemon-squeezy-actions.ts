"use server";

import { getAdminDb, verifyFirebaseIdToken } from "./firebase-admin";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

/**
 * Creates a Lemon Squeezy checkout for a limited offer (per-offer variant ID in Firestore).
 * Client opens the returned URL in a full window/tab (not the embedded overlay).
 */
export async function createOfferLemonCheckout(idToken: string, offerId: string) {
    try {
        const uid = await verifyFirebaseIdToken(idToken);
        const adminDb = await getAdminDb();
        const offerSnap = await adminDb.collection("offers").doc(offerId).get();
        if (!offerSnap.exists) {
            return { success: false as const, error: "Offer not found." };
        }
        const offer = offerSnap.data()!;
        const variantId = String(offer.lemonVariantId ?? "").trim();
        if (!variantId) {
            return { success: false as const, error: "This offer has no Lemon Squeezy variant ID configured." };
        }

        const apiKey = process.env.LEMONSQUEEZY_API_KEY;
        const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
        if (!apiKey || !storeId) {
            return { success: false as const, error: "Lemon Squeezy is not configured (API key / store ID)." };
        }

        lemonSqueezySetup({ apiKey });

        let prefillEmail = "";
        try {
            const { getAuth } = await import("firebase-admin/auth");
            const u = await getAuth().getUser(uid);
            prefillEmail = u.email ?? "";
        } catch {
            /* optional prefill */
        }

        const res = await createCheckout(storeId, variantId, {
            checkoutOptions: { embed: false },
            checkoutData: {
                ...(prefillEmail ? { email: prefillEmail } : {}),
                custom: {
                    offer_id: offerId,
                    user_uid: uid,
                },
            },
        });

        if (res.error) {
            return { success: false as const, error: res.error.message || "Failed to create checkout." };
        }

        const body = res.data as {
            data?: { attributes?: { url?: string } };
        } | null;
        const url = body?.data?.attributes?.url;
        if (!url) {
            return { success: false as const, error: "No checkout URL returned." };
        }

        return { success: true as const, checkoutUrl: url };
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Checkout failed.";
        return { success: false as const, error: msg };
    }
}
