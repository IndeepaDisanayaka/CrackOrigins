"use server";

import { getMongoDb } from '../mongodb';
import { encrypt, decrypt } from '../crypto';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';
import { updateUserLevel } from './rewards';
import { ObjectId } from 'mongodb';

export async function getOwnedGames(uid: string) {
    try {
        const db = await getMongoDb();
        const games: string[] = [];
        const details: Record<string, any> = {};
 
        const [payments, offers] = await Promise.all([
            db.collection("payments").find({ userId: uid, status: "COMPLETED" }).toArray(),
            db.collection("user_offers").find({ userId: uid }).toArray()
        ]);
 
        const processRecord = (data: any, isOffer = false) => {
            if (data.game) {
                games.push(data.game);
                
                let decryptedEmail = data.payerEmail || "unknown";
                if (decryptedEmail && decryptedEmail.includes(':')) {
                    try { decryptedEmail = decrypt(decryptedEmail); } catch(e) {}
                }
 
                details[data.game] = {
                    activationKey: data._id?.toString(),
                    purchaseDate: toIsoDate(data.purchaseDate) || new Date().toISOString(),
                    amount: data.amount,
                    status: data.status,
                    payerEmail: decryptedEmail,
                    isOffer
                };
            }
        };
 
        payments.forEach(d => processRecord(d));
        offers.forEach(d => processRecord(d, true));
 
        return { success: true, games, details };
    } catch (error: any) {
        console.error("Error fetching owned games:", error);
        return { success: false, error: error.message };
    }
}

export async function updateUserKey(adminUid: string, uid: string, paymentId: string, steamKey: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canUpdate = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'payments', 'UPDATE'));
        
        if (!adminDoc || !canUpdate) return { success: false, error: "Unauthorized." };
 
        const encryptedKey = encrypt(steamKey);
        
        let objId: any = paymentId;
        try { objId = new ObjectId(paymentId); } catch {}
 
        const res = await db.collection("payments").updateOne(
            { _id: objId, userId: uid },
            { $set: { steamKey: encryptedKey } }
        );
 
        if (res.matchedCount > 0) return { success: true };
 
        const resOffer = await db.collection("user_offers").updateOne(
            { _id: objId, userId: uid },
            { $set: { steamKey: encryptedKey } }
        );
 
        if (resOffer.matchedCount > 0) return { success: true };
 
        return { success: false, error: "Purchase record not found." };
    } catch (e: any) {
        console.error("Error updating key:", e);
        return { success: false, error: e.message };
    }
}

export async function getUserKey(uid: string, offerId: string) {
    try {
        const db = await getMongoDb();
        
        // 1. Try 'user_offers' collection
        let objId: any = offerId;
        try { objId = new ObjectId(offerId); } catch {}
        
        let data = await db.collection("user_offers").findOne({ 
            $or: [{ _id: objId }, { offerId: offerId }], 
            userId: uid 
        });

        // 2. Try 'payments' collection
        if (!data) {
            data = await db.collection("payments").findOne({ offerId, userId: uid });
        }
        
        if (!data) return { success: false, error: "Purchase record not found." };
        
        if (!data.steamKey) return { success: false, error: "Key not yet available. Still waiting for verification." };

        const keyVal = data.steamKey;
        
        if (keyVal.includes(':')) {
            try {
                return { success: true, steamKey: decrypt(keyVal) };
            } catch (err) {
                console.error("Decryption failure for key:", offerId, err);
                return { success: false, error: "Security mismatch: Key could not be decrypted." };
            }
        }
        
        return { success: true, steamKey: keyVal };
    } catch (e: any) {
        console.error("getUserKey Global Error:", e);
        return { success: false, error: "Failed to retrieve key due to a server error." };
    }
}

export async function getAffiliateProgress(uid: string, listedTime: string, offerId: string) {
    try {
        const db = await getMongoDb();
        const data = await db.collection("user_offers").findOne({ userId: uid, offerId });
        
        if (!data) {
            return { success: true, count: 0 };
        }

        return { success: true, count: data.investedXP || 0 };
    } catch (err: any) {
        console.error("Error fetching affiliate progress:", err);
        return { success: false, error: err.message };
    }
}

export async function investXP(uid: string, offerId: string, xp: number) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid });
        if (!userDoc) return { success: false, error: "User not found." };

        const currentXP = userDoc.xp ?? userDoc.discount ?? 0;
        if (currentXP < xp) {
            return { success: false, error: "Insufficient XP." };
        }

        let offerObjId: any = offerId;
        try { offerObjId = new ObjectId(offerId); } catch {}
        const offerData = await db.collection("offers").findOne({ _id: offerObjId });
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || offerData.targetAffiliates || 10);
        let currentProgress = 0;

        if (offerData.offerScope === 'global') {
            const investments = await db.collection("offer_investments").find({ offerId }).toArray();
            investments.forEach((d: any) => currentProgress += Number(d.xp || 0));
        } else {
            const userOffer = await db.collection("user_offers").findOne({ userId: uid, offerId });
            if (userOffer) {
                currentProgress = userOffer.investedXP || 0;
            }
        }

        if (currentProgress >= targetXP) {
             return { success: false, error: "Goal already reached! Investment failed." };
        }

        // Subtract XP
        await db.collection("accounts").updateOne(
            { uid },
            { $inc: { xp: -xp, discount: -xp } }
        );

        // Add to user's offer record
        await db.collection("user_offers").updateOne(
            { userId: uid, offerId },
            { 
                $inc: { investedXP: xp },
                $set: { lastInvested: new Date(), status: "investing" }
            },
            { upsert: true }
        );

        // Add to global offer investments
        await db.collection("offer_investments").insertOne({
            uid: uid,
            offerId,
            xp: xp,
            datetime: new Date(),
            email: userDoc.email,
            name: userDoc.name,
            photoURL: userDoc.photoURL
        });

        // Log to unified activity
        await db.collection("user_activity").insertOne({
            uid,
            type: 'spent',
            subType: 'investment',
            xp: -xp,
            title: `Invested in ${offerData.title}`,
            details: `Committed XP to help reach the giveaway goal.`,
            date: new Date(),
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
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!adminDoc?.isOwner && !adminDoc?.ruleId) {
            return { success: false, error: "Unauthorized." };
        }

        const investments = await db.collection("offer_investments").find({ offerId, isReturned: { $ne: true } }).toArray();
        if (investments.length === 0) return { success: true, message: "No investments to return." };

        const userXPMap: { [uid: string]: number } = {};
        investments.forEach((data: any) => {
            const uid = data.uid;
            if (!uid) return;
            const xp = Number(data.xp || 0);
            userXPMap[uid] = (userXPMap[uid] || 0) + xp;
        });

        let winnerUid = "";
        let maxXP = -1;
        for (const [uid, xp] of Object.entries(userXPMap)) {
            if (xp > maxXP) {
                maxXP = xp;
                winnerUid = uid;
            }
        }

        let offerObjId: any = offerId;
        try { offerObjId = new ObjectId(offerId); } catch {}
        const offerData = await db.collection("offers").findOne({ _id: offerObjId });
        if (!offerData) return { success: false, error: "Offer not found." };

        const targetXP = Number(offerData.targetXP || 10);
        let currentTotal = 0;
        investments.forEach((data: any) => currentTotal += Number(data.xp || 0));
        
        const goalReached = currentTotal >= targetXP;
        const actualWinner = goalReached ? winnerUid : null;

        let returnCount = 0;
        for (const data of investments) {
            if (actualWinner && data.uid === actualWinner) continue;

            const xpToReturn = Number(data.xp || 0);
            if (xpToReturn <= 0) continue;

            try {
                await db.collection("accounts").updateOne(
                    { uid: data.uid },
                    { $inc: { xp: xpToReturn, discount: xpToReturn } }
                );
                
                await db.collection("user_activity").insertOne({
                    uid: data.uid,
                    type: 'gain',
                    subType: 'refund',
                    xp: xpToReturn,
                    title: `XP Returned`,
                    details: `Refunded XP for unreached goal or lost challenge.`,
                    date: new Date(),
                    offerId: offerId
                });

                await db.collection("offer_investments").updateOne(
                    { _id: data._id },
                    { $set: { isReturned: true } }
                );
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
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: inviterUid });
        if (!userDoc) return { success: false, error: "Inviter not found." };
 
        const currentLevelTitle = userDoc.affiliateLevel || "starter";
 
        const levelData = await db.collection("reward_levels").findOne({ title: currentLevelTitle });
        const commPercent = levelData?.payment_commision || 2;
 
        let rewardXP = 0;
        if (type === 'onetime') {
            rewardXP = levelData?.onetime_reward_xp || 5;
        } else {
            rewardXP = Math.ceil((amount * commPercent) / 100);
        }
 
        if (rewardXP > 0) {
            await db.collection("accounts").updateOne(
                { uid: inviterUid },
                { $inc: { xp: rewardXP, discount: rewardXP } }
            );
 
            await db.collection("reward_history").insertOne({
                uid: inviterUid,
                type: type,
                rewardXP: rewardXP,
                amount: amount,
                timestamp: new Date()
            });
 
            await db.collection("user_activity").insertOne({
                uid: inviterUid,
                type: 'gain',
                subType: type === 'onetime' ? 'referral' : 'commission',
                xp: rewardXP,
                title: type === 'onetime' ? 'New Recruit Reward' : 'Mission Commission',
                details: type === 'onetime' ? 'Successfully recruited a new agent.' : `Earned commission from a recruit's purchase.`,
                date: new Date()
            });
 
            await updateUserLevel(inviterUid);
        }
 
        return { success: true };
    } catch (err: any) {
        console.error("Error adding affiliate reward:", err);
        return { success: false, error: err.message };
    }
}

