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
    /** True while card / another checkout is active */
    paymentLocked?: boolean;
    /** Fires when connecting, processing, or free-claim is in flight */
    onPaymentActivityChange?: (active: boolean) => void;
}

// Receiver address
const RECEIVER_ADDRESS = "0xd034739c2ae807c70cd703092b946f62a49509d1";

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

const SUPPORTED_CURRENCIES = [
    { 
        id: 'BNB', 
        name: 'BNB', 
        network: 'BSC' as const, 
        symbol: 'BNB', 
        isNative: true, 
        icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png',
        color: '#F3BA2F'
    },
    { 
        id: 'USDT_BSC', 
        name: 'USDT (BSC)', 
        network: 'BSC' as const, 
        symbol: 'USDT', 
        isNative: false, 
        address: '0x55d398326f99059fF775485246999027B3197955', 
        decimals: 18, 
        icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
        color: '#26A17B'
    },
    { 
        id: 'ETH', 
        name: 'ETH', 
        network: 'ETH' as const, 
        symbol: 'ETH', 
        isNative: true, 
        icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png',
        color: '#627EEA'
    },
    { 
        id: 'USDT_ETH', 
        name: 'USDT (ETH)', 
        network: 'ETH' as const, 
        symbol: 'USDT', 
        isNative: false, 
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7', 
        decimals: 6, 
        icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png',
        color: '#26A17B'
    },
    { 
        id: 'USDC_BSC', 
        name: 'USDC (BSC)', 
        network: 'BSC' as const, 
        symbol: 'USDC', 
        isNative: false, 
        address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', 
        decimals: 18, 
        icon: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png',
        color: '#2775CA'
    },
];

const ERC20_ABI = [
    "function transfer(address to, uint256 amount) public returns (bool)",
    "function decimals() public view returns (uint8)",
    "function symbol() public view returns (string)",
    "function balanceOf(address owner) public view returns (uint256)"
];

export default function Web3Checkout({
    amount,
    game,
    isOwned,
    onSuccess,
    appliedCoupon,
    offerId,
    paymentLocked = false,
    onPaymentActivityChange,
}: Web3CheckoutProps) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [status, setStatus] = useState<"idle" | "connecting" | "processing" | "completed" | "failed">("idle");
    const [cryptoPrice, setCryptoPrice] = useState<number | null>(null);
    const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>(SUPPORTED_CURRENCIES[1].id); // Default to USDT (BSC)
    const [isHovered, setIsHovered] = useState(false);
    const { showToast } = useToast();

    const activeCurrency = SUPPORTED_CURRENCIES.find(c => c.id === selectedCurrencyId) || SUPPORTED_CURRENCIES[0];

    const busy = status === "connecting" || status === "processing";
    useEffect(() => {
        onPaymentActivityChange?.(busy);
    }, [busy, onPaymentActivityChange]);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsub();
    }, []);

    // Effect to fetch crypto price
    useEffect(() => {
        const fetchPrice = async () => {
            if (activeCurrency.isNative) {
                try {
                    const coinId = activeCurrency.network === "ETH" ? "ethereum" : "binancecoin";
                    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
                    const data = await response.json();
                    setCryptoPrice(data[coinId].usd);
                } catch (error) {
                    console.error("Failed to fetch crypto price:", error);
                    setCryptoPrice(activeCurrency.network === "ETH" ? 2500 : 400); 
                }
            } else {
                // Stablecoins are fixed to 1 USD for calculation
                setCryptoPrice(1.0);
            }
        };
        fetchPrice();
    }, [activeCurrency]);

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
        if (paymentLocked) return;
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
            
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const userAddress = await signer.getAddress();

            // 2. Check and Switch Network
            const currentNetwork = await provider.getNetwork();
            const targetNetwork = NETWORKS[activeCurrency.network];
            
            if (currentNetwork.chainId !== BigInt(targetNetwork.chainId)) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: targetNetwork.chainId }],
                    });
                    // Wait a bit for the provider to sync with the new network
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        showToast(`Please add ${targetNetwork.name} to your MetaMask.`, "warning");
                    }
                    throw switchError;
                }
            }

            setStatus("processing");

            let tx;
            if (activeCurrency.isNative) {
                // Check native balance
                const balance = await provider.getBalance(userAddress);
                const cryptoAmount = (usdPrice / cryptoPrice).toFixed(6);
                const valueToSend = ethers.parseEther(cryptoAmount);

                if (balance < valueToSend) {
                    throw new Error(`Insufficient ${activeCurrency.symbol} balance.`);
                }

                // Send Native Transaction
                tx = await signer.sendTransaction({
                    to: RECEIVER_ADDRESS,
                    value: valueToSend,
                });
            } else {
                // Send ERC-20 Token Transaction
                const tokenAmount = ethers.parseUnits(usdPrice.toFixed(activeCurrency.decimals || 18), activeCurrency.decimals);
                const tokenContract = new ethers.Contract(activeCurrency.address!, ERC20_ABI, signer);
                
                // PRE-CHECK: Check token balance to avoid cryptic "estimateGas" fails
                try {
                    const balance = await tokenContract.balanceOf(userAddress);
                    if (balance < tokenAmount) {
                        throw new Error(`Insufficient ${activeCurrency.symbol} balance. Your balance: ${ethers.formatUnits(balance, activeCurrency.decimals)}`);
                    }
                } catch (balanceError: any) {
                    console.warn("Could not check token balance:", balanceError);
                    // Continue anyway, it might be a node issue, let the transfer try
                }

                tx = await tokenContract.transfer(RECEIVER_ADDRESS, tokenAmount);
            }

            showToast("Transaction submitted. Waiting for confirmation...", "info");

            const receipt = await tx.wait();
            
            if (receipt && receipt.status === 1) {
                const result = await recordWeb3Transaction(
                    tx.hash,
                    user.uid,
                    game,
                    usdPrice.toFixed(2),
                    userAddress,
                    `${activeCurrency.symbol} (${activeCurrency.network})`,
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
            
            // Helpful error mapping for common Web3 issues
            if (error.code === 4001 || error.message?.includes("user rejected")) {
                msg = "Transaction rejected by user.";
            } else if (error.code === "CALL_EXCEPTION" || error.message?.includes("estimateGas")) {
                msg = `Transaction failed: Insufficient ${activeCurrency.symbol} or native gas fee. Please check your wallet.`;
            } else if (error.message?.includes("insufficient funds")) {
                msg = `Insufficient funds for gas or transfer in your ${activeCurrency.network} wallet.`;
            } else if (error.message?.includes("Insufficient")) {
                msg = error.message; // Use our custom balance error message
            } else {
                msg = error.reason || error.message || msg;
            }
            
            showToast(msg, "error");
            setTimeout(() => setStatus("idle"), 4000);
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
                {paymentLocked && (
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                        Finish or close card checkout before using crypto.
                    </p>
                )}
                <div style={{ padding: "12px", border: "1px dashed var(--primary)", background: "rgba(254,182,12,0.05)", borderRadius: "8px", textAlign: "center", fontSize: "0.85rem" }}>
                    <strong>Exclusive Offer:</strong> This game is now free!
                </div>
                <button 
                    className="btnBuyNow" 
                    style={{ width: "100%", padding: "1rem" }}
                    onClick={async () => {
                        if (paymentLocked) return;
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
                    disabled={paymentLocked || status === "processing"}
                >
                    {status === "processing" ? "Linking Game..." : "Claim Now (Free)"}
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px", opacity: paymentLocked ? 0.45 : 1 }}>
            {paymentLocked && (
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                    Finish or close card checkout before paying with crypto.
                </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))", gap: "8px" }}>
                {SUPPORTED_CURRENCIES.map((cur) => (
                    <button 
                        key={cur.id}
                        type="button"
                        onClick={() => !paymentLocked && setSelectedCurrencyId(cur.id)}
                        title={cur.name}
                        disabled={paymentLocked || busy}
                        style={{ 
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                            padding: "8px 4px", 
                            borderRadius: "4px", 
                            border: selectedCurrencyId === cur.id ? `2px solid var(--primary)` : "1px solid rgba(255,255,255,0.1)",
                            background: selectedCurrencyId === cur.id ? `rgba(254,182,12,0.1)` : "rgba(255,255,255,0.02)",
                            color: selectedCurrencyId === cur.id ? "var(--primary)" : "#888",
                            cursor: paymentLocked || busy ? "not-allowed" : "pointer",
                            fontSize: "0.65rem",
                            transition: "all 0.2s ease"
                        }}
                    >
                        <img 
                            src={cur.icon} 
                            alt={cur.symbol} 
                            style={{ width: "20px", height: "20px" }} 
                            onError={(e) => {
                                // Fallback to a generic placeholder or just show symbol if icon fails
                                (e.target as any).style.display = 'none';
                            }}
                        />
                        <span style={{ fontWeight: selectedCurrencyId === cur.id ? "700" : "400" }}>{cur.symbol}</span>
                    </button>
                ))}
            </div>

            <button 
                type="button"
                onClick={handlePayment}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={paymentLocked || status === "connecting" || status === "processing"}
                style={{ 
                    width: "100%", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "12px",
                    background: isHovered && status === "idle" && !paymentLocked ? "var(--primary)" : "transparent",
                    color: isHovered && status === "idle" && !paymentLocked ? "#000" : "var(--primary)",
                    border: `2px solid var(--primary)`,
                    padding: "1rem",
                    borderRadius: "4px", 
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    cursor: (paymentLocked || status === "connecting" || status === "processing") ? "not-allowed" : "pointer",
                    opacity: (paymentLocked || status === "connecting" || status === "processing") ? 0.7 : 1,
                    transform: isHovered && status === "idle" && !paymentLocked ? "translateY(-2px)" : "none",
                    boxShadow: isHovered && status === "idle" && !paymentLocked ? "0 4px 12px rgba(254, 182, 12, 0.3)" : "none"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img 
                        src="https://images.ctfassets.net/clixtyxoaeas/1ezuBGezqfIeifWdVtwU4c/d970d4cdf13b163efddddd5709164d2e/MetaMask-icon-Fox.svg" 
                        alt="MetaMask" 
                        style={{ 
                            width: "24px", 
                            height: "24px",
                            filter: isHovered && status === "idle" ? "none" : "drop-shadow(0 0 2px var(--primary))"
                        }} 
                    />
                    <span style={{ fontSize: "0.85rem" }}>
                        {status === "idle" ? `Pay $${usdPrice.toFixed(2)} with ${activeCurrency.symbol}` : 
                         status === "connecting" ? "Connecting..." : 
                         status === "processing" ? "Confirming..." : 
                         status === "failed" ? "Failed - Try Again?" :
                         "Processing..."}
                    </span>
                </div>
            </button>
            
            {cryptoPrice && (
                <div style={{ textAlign: "center", fontSize: "0.75rem", color: "#888", background: "rgba(255,255,255,0.05)", padding: "8px", borderRadius: "4px" }}>
                    Paying on <strong>{NETWORKS[activeCurrency.network].name}</strong> <br/>
                    Approx. {(usdPrice / cryptoPrice).toFixed(6)} {activeCurrency.symbol}
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
