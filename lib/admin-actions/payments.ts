"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function getOwnedGames(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const paymentsRef = adminDb.collection("accounts").doc(uid).collection("payments");
        const snapshot = await paymentsRef.where("status", "==", "COMPLETED").get();

        const games: string[] = [];
        const details: Record<string, any> = {};

        const userRef = adminDb.collection("accounts").doc(uid);
        const [paymentsSnap, offersSnap] = await Promise.all([
            userRef.collection("payments").where("status", "==", "COMPLETED").get(),
            userRef.collection("offers").get()
        ]);

        const processDoc = (doc: any, isOffer = false) => {
            const data = doc.data();
            if (data.game) {
                games.push(data.game);
                
                let decryptedEmail = data.payerEmail || "unknown";
                if (decryptedEmail && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch(e) {}
                }

                details[data.game] = {
                    activationKey: doc.id,
                    purchaseDate: data.purchaseDate?.toDate?.()?.toISOString() || new Date().toISOString(),
                    amount: data.amount,
                    status: data.status,
                    payerEmail: decryptedEmail,
                    isOffer
                };
            }
        };

        paymentsSnap.forEach(doc => processDoc(doc));
        offersSnap.forEach(doc => processDoc(doc, true));

        return { success: true, games, details };
    } catch (error: any) {
        console.error("Error fetching owned games:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUserKey(adminUid: string, uid: string, paymentId: string, steamKey: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canUpdate = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'payments', 'UPDATE'));
        
        if (!adminDoc.exists || !canUpdate) return { success: false, error: "Unauthorized." };

        const encryptedKey = encrypt(steamKey);
        const userRef = adminDb.collection("accounts").doc(uid);
        
        // Try updating in both subcollections as we don't know which one holds it
        const [paymentDoc, offerDoc] = await Promise.all([
            userRef.collection("payments").doc(paymentId).get(),
            userRef.collection("offers").doc(paymentId).get()
        ]);

        if (paymentDoc.exists) {
            await userRef.collection("payments").doc(paymentId).update({ steamKey: encryptedKey });
            return { success: true };
        } else if (offerDoc.exists) {
            await userRef.collection("offers").doc(paymentId).update({ steamKey: encryptedKey });
            return { success: true };
        }

        return { success: false, error: "Purchase record not found." };
    } catch (e: any) {
        console.error("Error updating key:", e);
        return { success: false, error: e.message };
    }
}

export async function getUserKey(uid: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        
        // 1. Try 'offers' subcollection (New way: doc id is offer id)
        let offerDoc = await userRef.collection("offers").doc(offerId).get();
        let data = offerDoc.exists ? offerDoc.data() : null;

        // 2. Try 'payments' subcollection (Old way for backward compatibility)
        if (!data) {
            const paymentsRef = userRef.collection("payments");
            const snapshot = await paymentsRef.where("offerId", "==", offerId).limit(1).get();
            if (!snapshot.empty) data = snapshot.docs[0].data();
        }
        
        if (!data) return { success: false, error: "Purchase record not found." };
        
        if (!data.steamKey) return { success: false, error: "Key not yet available. Still waiting for verification." };

        const keyVal = data.steamKey;
        
        // If it's encrypted (contains :), decrypt it
        if (keyVal.includes(':')) {
            try {
                return { success: true, steamKey: decrypt(keyVal) };
            } catch (err) {
                console.error("Decryption failure for key:", offerId, err);
                return { success: false, error: "Security mismatch: Key could not be decrypted." };
            }
        }
        
        // Return as-is if it's not encrypted (legacy support)
        return { success: true, steamKey: keyVal };
    } catch (e: any) {
        console.error("getUserKey Global Error:", e);
        return { success: false, error: "Failed to retrieve key due to a server error." };
    }
}

export async function getAffiliateProgress(uid: string, listedTime: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();
        
        // Query the user's own 'offers' subcollection to see their individual investment progress
        const offerDoc = await adminDb.collection("accounts").doc(uid).collection("offers").doc(offerId).get();
        
        if (!offerDoc.exists) {
            return { success: true, count: 0 };
        }

        const data = offerDoc.data();
        return { success: true, count: data?.investedXP || 0 };
    } catch (err: any) {
        console.error("Error fetching affiliate progress:", err);
        return { success: false, error: err.message };
    }
}

export async function investXP(uid: string, offerId: string, xp: number) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "User not found." };

        const userData = userDoc.data()!;
        const currentXP = userData.xp ?? userData.discount ?? 0;
        if (currentXP < xp) {

            return { success: false, error: "Insufficient XP." };
        }

        // Check if goal reached

        const offerRef = adminDb.collection("offers").doc(offerId);
        const offerDoc = await offerRef.get();
        const offerData = offerDoc.data();
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || offerData.targetAffiliates || 10);
        let currentProgress = 0;

        if (offerData.offerScope === 'global') {
            // Global: community-wide progress
            const investmentsSnap = await offerRef.collection("investments").get();
            investmentsSnap.forEach(d => currentProgress += Number(d.data().xp || 0));
        } else {
            // Local: individual user progress
            const userOfferDoc = await userRef.collection("offers").doc(offerId).get();
            if (userOfferDoc.exists) {
                currentProgress = userOfferDoc.data()?.investedXP || 0;
            }
        }

        if (currentProgress >= targetXP) {
             return { success: false, error: "Goal already reached! Investment failed." };
        }


        // Subtract XP

        await userRef.update({
            xp: FieldValue.increment(-xp),
            discount: FieldValue.increment(-xp)
        });

        // Add to user's offer record
        await userRef.collection("offers").doc(offerId).set({
            offerId: offerId,
            investedXP: FieldValue.increment(xp),
            lastInvested: Timestamp.now(),
            status: "investing"
        }, { merge: true });


        // Add to global offer investments (using add() for separate records)
        await adminDb.collection("offers").doc(offerId).collection("investments").add({
            uid: uid,
            xp: xp,
            datetime: Timestamp.now(),
            email: userData.email,
            name: userData.name,
            photoURL: userData.photoURL
        });

        // Log to unified activity
        await userRef.collection("activity").add({
            type: 'spent',
            subType: 'investment',
            xp: -xp,
            title: `Invested in ${offerData.title}`,
            details: `Committed XP to help reach the giveaway goal.`,
            date: Timestamp.now(),
            offerId: offerId
        });




        // Update level after spending points
        await updateUserLevel(uid);

        return { success: true };
    } catch (err: any) {
        console.error("Error investing XP:", err);
        return { success: false, error: err.message };
    }
}

export async function returnGameXP(adminUid: string, offerId: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.data()?.isOwner && !adminDoc.data()?.ruleId) {
            return { success: false, error: "Unauthorized." };
        }

        const offerRef = adminDb.collection("offers").doc(offerId);
        const investmentsSnap = await offerRef.collection("investments").get();
        
        if (investmentsSnap.empty) return { success: true, message: "No investments to return." };

        // Aggregate by user to find the winner
        const userXPMap: { [uid: string]: number } = {};
        investmentsSnap.forEach(d => {
            const data = d.data();
            const uid = data.uid;
            if (!uid) return;
            const xp = Number(data.xp || 0);
            userXPMap[uid] = (userXPMap[uid] || 0) + xp;
        });

        // Find winner (uid with most XP)
        let winnerUid = "";
        let maxXP = -1;
        for (const [uid, xp] of Object.entries(userXPMap)) {
            if (xp > maxXP) {
                maxXP = xp;
                winnerUid = uid;
            }
        }

        const offerDoc = await offerRef.get();
        const offerData = offerDoc.data();
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || 10);

        let currentTotal = 0;
        investmentsSnap.forEach(d => currentTotal += Number(d.data().xp || 0));
        
        // If goal not reached, no one is a winner, return to everyone
        const goalReached = currentTotal >= targetXP;
        const actualWinner = goalReached ? winnerUid : null;

        let returnCount = 0;
        for (const d of investmentsSnap.docs) {
            const data = d.data();
            if (data.isReturned) continue;
            if (actualWinner && data.uid === actualWinner) continue; // Winner doesn't get XP back


            const xpToReturn = Number(data.xp || 0);
            if (xpToReturn <= 0) continue;

            const userRef = adminDb.collection("accounts").doc(data.uid);
            
            // Return XP to user
            try {
                await userRef.update({
                    xp: FieldValue.increment(xpToReturn),
                    discount: FieldValue.increment(xpToReturn)
                });
                
                // Log to unified activity
                await userRef.collection("activity").add({
                    type: 'gain',
                    subType: 'refund',
                    xp: xpToReturn,
                    title: `XP Returned`,
                    details: `Refunded XP for unreached goal or lost challenge.`,
                    date: Timestamp.now(),
                    offerId: offerId
                });

                // Mark as returned
                await d.ref.update({ isReturned: true });
                returnCount++;
            } catch (uErr) {
                console.error(`Failed to return XP to user ${data.uid}:`, uErr);
            }

        }

        return { success: true, message: `Successfully returned XP for ${returnCount} investments. Winner UID: ${winnerUid}.` };
    } catch (err: any) {
        console.error("Error returning XP:", err);
        return { success: false, error: err.message };
    }
}

export async function addAffiliateReward(inviterUid: string, amount: number, type: 'onetime' | 'commission') {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(inviterUid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "Inviter not found." };

        const userData = userDoc.data()!;
        const currentLevelTitle = userData.affiliateLevel || "starter";

        // Fetch level config
        const levelsSnap = await adminDb.collection("reward_levels").where("title", "==", currentLevelTitle).get();
        const levelData = levelsSnap.docs[0]?.data();
        const commPercent = levelData?.payment_commision || 2;

        let rewardXP = 0;
        if (type === 'onetime') {
            rewardXP = levelData?.onetime_reward_xp || 5;
        } else {
            // commission based on payment amount
            rewardXP = Math.ceil((amount * commPercent) / 100);
        }

        console.log(`[AffiliateReward] User: ${inviterUid}, Level: ${currentLevelTitle}, Reward: ${rewardXP} XP, Type: ${type}`);

        if (rewardXP > 0) {
            await userRef.update({
                xp: FieldValue.increment(rewardXP),
                discount: FieldValue.increment(rewardXP) // Keep syncing to discount for now just in case
            });


            // Log history
            await userRef.collection("reward_history").add({
                type: type,
                rewardXP: rewardXP,
                amount: amount,
                timestamp: Timestamp.now()
            });

            // Log to unified activity
            await userRef.collection("activity").add({
                type: 'gain',
                subType: type === 'onetime' ? 'referral' : 'commission',
                xp: rewardXP,
                title: type === 'onetime' ? 'New Recruit Reward' : 'Mission Commission',
                details: type === 'onetime' ? 'Successfully recruited a new agent.' : `Earned commission from a recruit's purchase.`,
                date: Timestamp.now()
            });

            // Update level after getting XP
            await updateUserLevel(inviterUid);

        }

        return { success: true };
    } catch (err: any) {
        console.error("Error adding affiliate reward:", err);
        return { success: false, error: err.message };
    }
}

