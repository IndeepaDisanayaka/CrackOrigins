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
        console.log("Creating checkout for offerId:", offerId, "user:", uid);
        
        const offerSnap = await adminDb.collection("offers").doc(offerId).get();
        if (!offerSnap.exists) {
            console.error("Offer not found in DB:", offerId);
            return { success: false as const, error: "Offer not found." };
        }
        const offer = offerSnap.data()!;
        const variantId = String(offer.lemonVariantId ?? "").trim();
        console.log("Found offer:", offer.title, "variantId (string):", variantId);

        if (!variantId) {
            return { success: false as const, error: "This offer has no Lemon Squeezy variant ID configured." };
        }

        const apiKey = process.env.LEMONSQUEEZY_API_KEY;
        const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
        if (!apiKey || !storeId) {
            console.error("Lemon Squeezy config missing or invalid.");
            return { success: false as const, error: "Lemon Squeezy configuration is missing in .env.local" };
        }

        lemonSqueezySetup({ apiKey });

        let prefillEmail = "";
        try {
            const { getAuth } = await import("firebase-admin/auth");
            const u = await getAuth().getUser(uid);
            prefillEmail = u.email ?? "";
        } catch {
            /* optional prefill email */
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        console.log(`Attempting createCheckout: Store=${storeId}, Variant=${variantId}`);
        const res = await createCheckout(storeId, variantId, {
            checkoutOptions: { 
                embed: false,
            },
            productOptions: {
                redirectUrl: `${baseUrl}/`
            },
            checkoutData: {
                ...(prefillEmail ? { email: prefillEmail } : {}),
                custom: {
                    offer_id: offerId,
                    user_uid: uid,
                },
            },
        });

        console.log("Lemon Squeezy raw response:", JSON.stringify(res, null, 2));

        if (res.error) {
            console.error("Lemon Squeezy API Error:", res.error);
            return { 
                success: false as const, 
                error: `Lemon Squeezy Error: ${res.error.message || "Unknown error"} (Status: ${res.statusCode || "N/A"})`
            };
        }

        const body = res.data as {
            data?: { attributes?: { url?: string } };
        } | null;
        const url = body?.data?.attributes?.url;
        if (!url) {
            console.error("No URL in res.data:", JSON.stringify(res.data));
            return { success: false as const, error: "No checkout URL returned." };
        }

        console.log("Checkout URL created:", url);
        return { success: true as const, checkoutUrl: url };
    } catch (e: unknown) {
        console.error("createOfferLemonCheckout catch block:", e);
        const msg = e instanceof Error ? e.message : "Checkout failed.";
        return { success: false as const, error: msg };
    }
}
