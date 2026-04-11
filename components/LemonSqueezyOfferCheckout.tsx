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

    const openCheckout = async () => {
        const user = auth.currentUser;
        if (!user) {
            showToast("Please login to proceed with the payment.", "error");
            return;
        }
        setBusy(true);
        onOpenStart?.();
        try {
            const idToken = await user.getIdToken();
            const res = await createOfferLemonCheckout(idToken, offerId);
            if (!res.success) {
                showToast(res.error, "error");
                return;
            }
            const tab = window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
            if (!tab) {
                window.location.assign(res.checkoutUrl);
                showToast("Redirecting to secure checkout…", "info");
                return;
            }
            showToast("Complete payment in the new tab, then return here.", "info");
        } catch {
            showToast("Could not start checkout.", "error");
        } finally {
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
