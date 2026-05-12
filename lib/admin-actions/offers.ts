"use server";

import { getMongoDb } from '../mongodb';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';
import { ObjectId } from 'mongodb';

export async function createOffer(adminUid: string, offerData: {
    id: string;
    title: string;
    originalPrice: number;
    discount: string;
    expire: string;
    quantity: number;
    operatingSystem: string;
    platform: string;
    gameUrl?: string;
    isGiveaway?: boolean;
    targetXP?: number;
    targetAffiliates?: number;
}) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canWrite = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'offers', 'WRITE'));

        if (!userDoc || !canWrite) {
            return { success: false, error: "Unauthorized." };
        }

        const { id, ...data } = offerData;
        
        await db.collection("offers").updateOne(
            { _id: id as any },
            { 
                $set: {
                    ...data,
                    originalPrice: Number(data.originalPrice),
                    quantity: Number(data.quantity),
                    expire: new Date(data.expire),
                    listed: new Date(),
                    targetXP: Number(data.targetXP || data.targetAffiliates || 10),
                }
            },
            { upsert: true }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateOffer(adminUid: string, offerId: string, offerData: any) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canUpdate = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'offers', 'UPDATE'));

        if (!userDoc || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        const payload: any = {
            ...offerData,
        };

        if (offerData.originalPrice !== undefined) {
             payload.originalPrice = Number(offerData.originalPrice);
        }
        if (offerData.quantity !== undefined) {
             payload.quantity = Number(offerData.quantity);
        }
        if (offerData.targetXP !== undefined) {
             payload.targetXP = Number(offerData.targetXP);
        } else if (offerData.targetAffiliates !== undefined) {
             payload.targetXP = Number(offerData.targetAffiliates);
        }

        if (offerData.expire) {
            payload.expire = new Date(offerData.expire);
        }
        
        delete payload.listed;

        await db.collection("offers").updateOne(
            { _id: offerId as any },
            { $set: payload }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error updating offer:", error);
        return { success: false, error: error.message };
    }
}

export async function cleanupExpiredOffers(adminUid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || (!userDoc.isOwner && !userDoc.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        const now = new Date();
        const expiredOffers = await db.collection("offers").find({ expire: { $lt: now } }).toArray();

        if (expiredOffers.length === 0) {
            return { success: true, count: 0, message: "No expired offers found." };
        }

        // Identify which expired offers have sales
        const expiredIds = expiredOffers.map(o => o._id);
        const userOffers = await db.collection("user_offers").find({ offerId: { $in: expiredIds } }).toArray();
        const soldOfferIds = new Set(userOffers.map(u => u.offerId));

        let deletedCount = 0;
        for (const offer of expiredOffers) {
            if (!soldOfferIds.has(offer._id)) {
                await db.collection("offers").deleteOne({ _id: offer._id });
                deletedCount++;
            }
        }

        return { success: true, count: deletedCount, message: `Cleaned up ${deletedCount} expired and unsold offers.` };
    } catch (error: any) {
        console.error("Error cleaning up offers:", error);
        return { success: false, error: error.message };
    }
}



/**
 * Get all purchased offers for a user (payments + user_offers subcollections).
 * Replaces Firestore onSnapshot listeners in SteamMarketplace.
 */
export async function getUserPurchasedOffers(userId: string) {
    try {
        const { getMongoDb } = await import('../mongodb');
        const db = await getMongoDb();
        const payments = await db.collection('payments').find({ userId } as any).toArray();
        const userOffers = await db.collection('user_offers').find({ userId } as any).toArray();
        const offers: Record<string, any> = {};
        for (const p of payments as any[]) {
            if (p.offerId) offers[p.offerId] = p;
        }
        for (const o of userOffers as any[]) {
            const key = o.offerId || o._id;
            offers[key] = { ...(offers[key] || {}), ...o };
        }
        return { success: true, purchasedOffers: offers, offers };
    } catch (error: any) {
        console.error('Error fetching user purchased offers:', error);
        return { success: false, error: error.message, offers: {} };
    }
}