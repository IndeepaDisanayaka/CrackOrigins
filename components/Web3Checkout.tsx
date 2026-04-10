"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { useToast } from "./Toast";
import { recordWeb3Transaction } from "../lib/web3-actions";

interface Web3CheckoutProps {
    amount: string; // Amount in USD
    game: string;
    isOwned?: boolean;
    onSuccess?: () => void;
    appliedCoupon?: any;
    offerId?: string;
}

// Receiver address - THIS SHOULD BE CONFIGURED!
const RECEIVER_ADDRESS = "0xd034739c2ae807c70cd703092b946f62a49509d1"; // Replace with actual address

const NETWORKS = {
    ETH: {
        chainId: "0x1",
        name: "Ethereum Mainnet",
        symbol: "ETH",
        rpc: "https://mainnet.infura.io/v3/",
    },
    BSC: {
        chainId: "0x38",
        name: "Binance Smart Chain",
        symbol: "BNB",
        rpc: "https://bsc-dataseed.binance.org/",
    }
};

export default function Web3Checkout({ amount, game, isOwned, onSuccess, appliedCoupon, offerId }: Web3CheckoutProps) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [status, setStatus] = useState<"idle" | "connecting" | "processing" | "completed" | "failed">("idle");
    const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
    const [network, setNetwork] = useState<keyof typeof NETWORKS>("BSC"); // Default to BSC as requested
    const { showToast } = useToast();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsub();
    }, []);

    // Effect to fetch crypto price (BNB or ETH) in USD
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const coinId = network === "ETH" ? "ethereum" : "binancecoin";
                const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                const data = await response.json();
                setCryptoPrice(data[coinId].usd);
            } catch (error) {
                console.error("Failed to fetch crypto price:", error);
                // Fallback rates if API fails
                setCryptoPrice(network === "ETH" ? 2500 : 400); 
            }
        };
        fetchPrice();
    }, [network]);

    const base = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0;
    const discRaw = appliedCoupon?.discount;
    const discStr = discRaw ? String(discRaw).trim() : "";
    let finalUSD = base;

    if (discStr.includes('%')) {
        const percent = parseFloat(discStr) || 0;
        finalUSD = base - (base * percent / 100);
    } else {
        finalUSD = base - (parseFloat(discStr) || 0);
    }
    const usdPrice = Math.max(0, finalUSD);

    const handlePayment = async () => {
        if (!user) {
            showToast("Please login to proceed with the payment.", "error");
            return;
        }

        if (!window.ethereum) {
            showToast("MetaMask is not installed. Please install it to continue.", "error");
            window.open("https://metamask.io/download/", "_blank");
            return;
        }

        if (!cryptoPrice) {
            showToast("Fetching current market price... please try again in a moment.", "info");
            return;
        }

        try {
            setStatus("connecting");
            
            // 1. Request account access
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            // 2. Check and Switch Network
            const currentNetwork = await provider.getNetwork();
            const targetNetwork = NETWORKS[network];
            
            if (currentNetwork.chainId !== BigInt(targetNetwork.chainId)) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: targetNetwork.chainId }],
                    });
                } catch (switchError: any) {
                    // This error code indicates that the chain has not been added to MetaMask.
                    if (switchError.code === 4902) {
                        showToast(`Please add ${targetNetwork.name} to your MetaMask.`, "warning");
                    }
                    throw switchError;
                }
            }

            setStatus("processing");

            // 3. Calculate crypto amount
            const cryptoAmount = (usdPrice / cryptoPrice).toFixed(6);
            const valueToSend = ethers.parseEther(cryptoAmount);

            // 4. Send Transaction
            const tx = await signer.sendTransaction({
                to: RECEIVER_ADDRESS,
                value: valueToSend,
            });

            showToast("Transaction submitted. Waiting for confirmation...", "info");

            // 5. Wait for confirmation
            const receipt = await tx.wait();
            
            if (receipt && receipt.status === 1) {
                // 6. Record on server
                const result = await recordWeb3Transaction(
                    tx.hash,
                    user.uid,
                    game,
                    usdPrice.toFixed(2),
                    userAddress,
                    network,
                    appliedCoupon?.code,
                    offerId
                );

                if (result.success) {
                    setStatus("completed");
                    showToast(`Success! ${game} is now linked to your Crack Origins library.`, "success");
                    if (onSuccess) onSuccess();
                } else {
                    throw new Error(result.error || "Failed to record transaction.");
                }
            } else {
                throw new Error("Transaction failed on the blockchain.");
            }

        } catch (error: any) {
            console.error("Web3 Payment Error:", error);
            setStatus("failed");
            
            let msg = "An error occurred during payment.";
            if (error.code === 4001) {
                msg = "Transaction rejected by user.";
            } else if (error.code === -32603) {
                msg = "Internal JSON-RPC error. Check your balance.";
            } else if (error.message?.includes("insufficient funds")) {
                msg = "Insufficient funds in your wallet.";
            } else {
                msg = error.reason || error.message || msg;
            }
            
            showToast(msg, "error");
            
            // Revert status to idle after a short delay so user can try again
            setTimeout(() => setStatus("idle"), 3000);
        }
    };

    if (isOwned || status === "completed") {
        return (
            <div style={{ color: "#feb60c", fontWeight: "bold", textAlign: "center", padding: "10px", border: "1px solid var(--primary)", background: "rgba(254,182,12,0.1)", borderRadius: "8px" }}>
                {isOwned ? "ALREADY OWNED: You can proceed to download your library." : "Payment Successful! This game is now yours."}
            </div>
        );
    }

    if (usdPrice <= 0) {
        return (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ padding: "12px", border: "1px dashed var(--primary)", background: "rgba(254,182,12,0.05)", borderRadius: "8px", textAlign: "center", fontSize: "0.85rem" }}>
                    <strong>Exclusive Offer:</strong> This game is now free!
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
                        const result = await recordWeb3Transaction("FREE_CLAIM_" + Date.now(), user.uid, game, "0.00", "0x0", "NONE", appliedCoupon?.code, offerId);
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
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
                <button 
                    onClick={() => setNetwork("BSC")}
                    style={{ 
                        flex: 1, 
                        padding: "8px", 
                        borderRadius: "6px", 
                        border: network === "BSC" ? "1px solid #feb60c" : "1px solid #333",
                        background: network === "BSC" ? "rgba(254,182,12,0.1)" : "transparent",
                        color: network === "BSC" ? "#feb60c" : "#888",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                    }}
                >
                    BSC (BNB)
                </button>
                <button 
                    onClick={() => setNetwork("ETH")}
                    style={{ 
                        flex: 1, 
                        padding: "8px", 
                        borderRadius: "6px", 
                        border: network === "ETH" ? "1px solid #feb60c" : "1px solid #333",
                        background: network === "ETH" ? "rgba(254,182,12,0.1)" : "transparent",
                        color: network === "ETH" ? "#feb60c" : "#888",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                    }}
                >
                    ETH
                </button>
            </div>

            <button 
                className="btnBuyNow"
                onClick={handlePayment}
                disabled={status === "connecting" || status === "processing"}
                style={{ 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "12px",
                    background: "linear-gradient(135deg, #feb60c, #ffe066, #feb60c)",
                    backgroundSize: "200% auto",
                    color: "#000000",
                    border: "none",
                    padding: "1rem",
                    borderRadius: "0", // Matching site's * { border-radius: 0 !important }
                    fontWeight: "910",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    animation: "shineGradient 3s linear infinite",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 10px 20px rgba(254, 182, 12, 0.2)",
                    transition: "all 0.4s ease"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", position: "relative", zIndex: 2 }}>
                    <img 
                        src="https://images.ctfassets.net/clixtyxoaeas/1ezuBGezqfIeifWdVtwU4c/d970d4cdf13b163efddddd5709164d2e/MetaMask-icon-Fox.svg" 
                        alt="MetaMask" 
                        style={{ width: "24px", height: "24px" }} 
                    />
                    <span style={{ fontSize: "0.85rem" }}>
                        {status === "idle" ? `Pay $${usdPrice.toFixed(2)} with MetaMask` : 
                         status === "connecting" ? "Connecting Wallet..." : 
                         status === "processing" ? "Confirming..." : 
                         status === "failed" ? "Failed - Try Again?" :
                         "Processing..."}
                    </span>
                </div>
            </button>
            
            {cryptoPrice && (
                <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#666" }}>
                    Approx. {(usdPrice / cryptoPrice).toFixed(6)} {NETWORKS[network].symbol}
                </div>
            )}
        </div>
    );
}

declare global {
    interface Window {
        ethereum?: any;
    }
}
