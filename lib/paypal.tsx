"use client"; // Next.js 13+ app directory

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useToast } from "../components/Toast";

import { capturePayPalOrder } from "./paypal-actions";

interface CheckoutProps {
    amount: string;
    game: string;
    gameId: string | number;
    isOwned?: boolean;
    onSuccess?: () => void;
    appliedCoupon?: any;
    offerId?: string;
    onPaymentActivityChange?: (active: boolean) => void;
}

export default function Checkout({ amount, game, gameId, isOwned, onSuccess, appliedCoupon, offerId, onPaymentActivityChange }: CheckoutProps) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [status, setStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
    const { showToast } = useToast();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsub();
    }, []);

    const base = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const discRaw = appliedCoupon?.discount;
    const discStr = discRaw ? String(discRaw).trim() : "";
    let finalAmt = base;

    if (discStr.includes('%')) {
        const percent = parseFloat(discStr) || 0;
        finalAmt = base - (base * percent / 100);
    } else {
        finalAmt = base - (parseFloat(discStr) || 0);
    }
    const price = Math.max(0, finalAmt);

    if (isOwned || status === "completed") {
        return (
            <div style={{ color: "#feb60c", fontWeight: "bold", textAlign: "center", padding: "10px", border: "1px solid var(--primary)", background: "rgba(254,182,12,0.1)" }}>
                {isOwned ? "ALREADY OWNED: You can proceed to download your library." : "Payment Successful! This game is now yours."}
            </div>
        );
    }

    if (price <= 0) {
        return (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "12px", border: "1px dashed var(--primary)", background: "rgba(254,182,12,0.05)", borderRadius: "8px", textAlign: "center", fontSize: "0.85rem" }}>
                    <strong>Exclusive Offer:</strong> This game is now free after the applied discount!
                </div>
                <button 
                    className="btnBuyNow" 
                    style={{ width: "100%", padding: "1rem" }}
                    onClick={async () => {
                        if (!user) {
                            showToast("Please login to claim your game.", "error");
                            return;
                        }
                        setStatus("processing");
                        const result = await capturePayPalOrder("FREE_CLAIM_" + Date.now(), user.uid, game, "0.00", appliedCoupon?.code, offerId, gameId);
                        if (result.success) {
                            setStatus("completed");
                            showToast(`Success! ${game} has been added to your library.`, "success");
                            if (onSuccess) onSuccess();
                        } else {
                            setStatus("failed");
                            showToast(result.error || "Failed to link game to account.", "error");
                        }
                    }}
                    disabled={status === "processing"}
                >
                    {status === "processing" ? "Linking Game..." : "Claim Now (Free)"}
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: "100%",padding:1 }}> {/* responsive container */}
            <PayPalScriptProvider
                options={{
                    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
                    currency: "USD",
                    intent: "capture",
                }}
            
            >
                <div style={{ opacity: status === "processing" ? 0.5 : 1, pointerEvents: status === "processing" ? "none" : "auto" }}>
                    <PayPalButtons
                        style={{
                            layout: "vertical",
                            color: "white",
                            shape: "rect",
                            label: "paypal",
                            height: 45 // Fixed height for consistency
                        }}
                        onError={(err) => {
                            console.error("PayPal Error:", err);
                            showToast("PayPal failed to load or encountered an error. Check your connection.", "error");
                            if (onPaymentActivityChange) onPaymentActivityChange(false);
                        }}
                        createOrder={(data, actions) => {
                            if (isOwned) {
                                showToast("You already own this game!", "warning");
                                return Promise.reject("ALREADY_OWNED");
                            }
                            if (onPaymentActivityChange) onPaymentActivityChange(true);
                            return actions.order.create({
                                intent: "CAPTURE",
                                purchase_units: [
                                    {
                                        amount: {
                                            currency_code: "USD",
                                            value: price.toFixed(2),
                                        },
                                        description: `Purchase of ${game}`,
                                    },
                                ],
                            });
                        }}
                        onApprove={async (data) => {
                            if (!user) {
                                showToast("Please login to proceed with the payment.", "error");
                                return;
                            }
                            
                            try {
                                setStatus("processing");
                                const result = await capturePayPalOrder(data.orderID, user.uid, game, price.toFixed(2), appliedCoupon?.code, offerId, gameId);
                                
                                if (result.success) {
                                    setStatus("completed");
                                    showToast(`Success! ${game} is now linked to your Crack Origins library.`, "success");
                                    if (onSuccess) {
                                        onSuccess(); // Trigger live update in UI
                                    }
                                } else {
                                    setStatus("failed");
                                    console.error("Payment Capture Error:", result.error);
                                    showToast(result.error || "Payment verification failed. Please contact support.", "error");
                                }
                            } catch (err: any) {
                                setStatus("failed");
                                showToast(err.message || "An unexpected error occurred during payment.", "error");
                            } finally {
                                if (onPaymentActivityChange) onPaymentActivityChange(false);
                            }
                        }}
                        onCancel={() => {
                            if (onPaymentActivityChange) onPaymentActivityChange(false);
                        }}
                    />
                    {status === "processing" && (
                        <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#feb60c", marginTop: "5px", padding: "10px", background: "rgba(254,182,12,0.1)", borderRadius: "8px" }}>
                            Verifying transaction securely...
                        </div>
                    )}
                </div>
            </PayPalScriptProvider>
        </div>
    );
}
