"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createOfferLemonCheckout } from "@/lib/lemon-squeezy-actions";
import { useToast } from "./Toast";

interface LemonSqueezyOfferCheckoutProps {
    offerId: string;
    /** When true, crypto checkout is in progress */
    disabled?: boolean;
    /** Fires when user starts card checkout (lock other methods) */
    onOpenStart?: () => void;
}

export default function LemonSqueezyOfferCheckout({
    offerId,
    disabled = false,
    onOpenStart,
}: LemonSqueezyOfferCheckoutProps) {
    const [busy, setBusy] = useState(false);
    const { showToast } = useToast();

    const openCheckout = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const user = auth.currentUser;
        if (!user) {
            showToast("Please login to proceed with the payment.", "error");
            return;
        }
        if (busy) return;

        setBusy(true);
        onOpenStart?.();
        try {
            const idToken = await user.getIdToken();
            const res = await createOfferLemonCheckout(idToken, offerId);
            if (!res.success) {
                showToast(res.error, "error");
                setBusy(false);
                return;
            }

            // Standard approach to avoid double-opening or popup blocks: 
            // Prefer window.location for checkout redirects to be safe and consistent.
            window.location.assign(res.checkoutUrl);
            showToast("Redirecting to secure checkout…", "info");
            
            // Note: We don't setbusy(false) here immediately because we want to keep the UI
            // locked while the page is unloading/redirecting.
        } catch (err) {
            console.error("Open Checkout error:", err);
            showToast("Could not start checkout.", "error");
            setBusy(false);
        }
    };

    const locked = disabled || busy;

    return (
        <button
            type="button"
            onClick={openCheckout}
            disabled={locked}
            className="btnBuyNow"
            style={{
                width: "100%",
                padding: "1rem",
                opacity: disabled ? 0.45 : 1,
                cursor: locked ? "not-allowed" : "pointer",
            }}
        >
            {busy ? "Opening checkout…" : "Pay with card (full page)"}
        </button>
    );
}
