"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from '../firebase-admin';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';

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
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'offers', 'WRITE'));

        if (!userDoc.exists || !canWrite) {
            return { success: false, error: "Unauthorized." };
        }


        await adminDb.collection("offers").doc(offerData.id).set({
            ...offerData,
            originalPrice: Number(offerData.originalPrice),
            quantity: Number(offerData.quantity),
            expire: Timestamp.fromDate(new Date(offerData.expire)),
            listed: Timestamp.now(),
            targetXP: Number(offerData.targetXP || offerData.targetAffiliates || 10),
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateOffer(adminUid: string, offerId: string, offerData: any) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canUpdate = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'offers', 'UPDATE'));

        if (!userDoc.exists || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        const offerRef = adminDb.collection("offers").doc(offerId);
        
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
            payload.expire = Timestamp.fromDate(new Date(offerData.expire));
        }
        
        // Remove listed to avoid overwriting it
        delete payload.listed;

        await offerRef.update(payload);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating offer:", error);
        return { success: false, error: error.message };
    }
}

export async function cleanupExpiredOffers(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || (!adminDoc.data()?.isOwner && !adminDoc.data()?.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        // 1. Get all offers
        const offersSnap = await adminDb.collection("offers").get();
        const now = new Date();
        
        const expiredOffers = offersSnap.docs.filter((doc: any) => {
            const data = doc.data();
            const expireDate = data.expire?.toDate ? data.expire.toDate() : new Date(data.expire);
            return expireDate < now;
        });

        if (expiredOffers.length === 0) {
            return { success: true, count: 0, message: "No expired offers found." };
        }

        // 2. Identify which expired offers have sales
        const soldOfferIds = new Set<string>();
        const purchasesSnap = await adminDb.collectionGroup("offers").get();
        
        purchasesSnap.forEach((doc: any) => {
            // We only want documents from 'accounts/{uid}/offers' subcollections, 
            // not the root 'offers' collection itself.
            if (doc.ref.path.includes("accounts/")) {
                soldOfferIds.add(doc.id);
            }
        });

        // 3. Delete those that are expired AND have no sales
        let deletedCount = 0;
        const batch = adminDb.batch();

        for (const offerDoc of expiredOffers) {
            if (!soldOfferIds.has(offerDoc.id)) {
                batch.delete(offerDoc.ref);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            await batch.commit();
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
        return { success: true, offers };
    } catch (error: any) {
        console.error('Error fetching user purchased offers:', error);
        return { success: false, error: error.message, offers: {} };
    }
}