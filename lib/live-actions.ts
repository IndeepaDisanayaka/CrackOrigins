"use server";

import { getMongoDb } from './mongodb';
import { toIsoDate } from './admin-actions/helpers';

/**
 * Fetch marketplace offers from Firestore using Admin SDK (bypasses rules)
 */
export async function getGlobalOffers() {
    try {
        const db = await getMongoDb();
        const docs = await db.collection("offers").find().toArray();
        
        const offers = docs.map((data: any) => {
            let discountPercent = 0;
            if (typeof data.discount === 'string') {
              discountPercent = Number(data.discount.replace('%', '').replace('-', ''));
            } else if (typeof data.discount === 'number') {
              discountPercent = data.discount;
            }
            const originalPrice = Number(data.originalPrice || 0);
            const discountPrice = isNaN(discountPercent) ? originalPrice : originalPrice - (originalPrice * discountPercent / 100);

            const steamAppId = data.gameUrl?.match(/\/app\/(\d+)/)?.[1] || data._id;

            return {
              id: data._id.toString(),
              title: data.title || 'Unknown Game',
              originalPrice: `$${originalPrice.toFixed(2)}`,
              discountPrice: `$${discountPrice.toFixed(2)}`,
              discount: (typeof data.discount === 'string' && data.discount.includes('-')) ? data.discount : `-${discountPercent}%`,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`,
              platforms: data.operatingSystem ? [String(data.operatingSystem).toLowerCase()] : ['windows'],
              steamUrl: data.gameUrl || `https://store.steampowered.com/app/${steamAppId}/`,
              endTime: toIsoDate(data.expire) || new Date().toISOString(),
              listed: toIsoDate(data.listed) || new Date().toISOString(),
              targetXP: Number(data.targetXP || data.targetAffiliates || 10),
              quantity: Number(data.quantity || 0),
              steamAppId: steamAppId,
              offerScope: data.offerScope || 'local',
            };
        });

        return offers.filter((o: any) => {
            const expireTime = new Date(o.endTime).getTime();
            return !isNaN(expireTime) && expireTime > Date.now();
        }).sort((a: any, b: any) => {
            const aIsFree = parseFloat(a.discountPrice.replace('$', '')) === 0;
            const bIsFree = parseFloat(b.discountPrice.replace('$', '')) === 0;
            if (aIsFree && !bIsFree) return -1;
            if (!aIsFree && bIsFree) return 1;
            return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
        });
    } catch (error) {
        console.error("Error fetching global offers:", error);
        return [];
    }
}

/**
 * Server Action: Get Global Giveaway Leaderboard (Top 5 + Total Fill Count)
 * Now uses the actual investments subcollection for the offer.
 */
export async function getGiveawayLeaderboard(target: number, listedTime: string, offerId: string) {
    try {
        const db = await getMongoDb();
        const investments = await db.collection("offer_investments").find({ offerId }).toArray();

        const userMap = new Map<string, { uid: string, displayName: string, xp: number, photoURL?: string }>();
        let totalFilled = 0;

        investments.forEach((data: any) => {
            const xp = Number(data.xp || data.points || 0);
            const uid = data.uid || data._id.toString(); 
            totalFilled += xp;
            
            if (userMap.has(uid)) {
                userMap.get(uid)!.xp += xp;
            } else {
                userMap.set(uid, {
                    uid: uid,
                    displayName: data.name || "Anonymous Contributor",
                    xp: xp,
                    photoURL: data.photoURL || null
                });
            }
        });

        const leaderboard = Array.from(userMap.values()) as { uid: string, displayName: string, xp: number, photoURL?: string }[];
        leaderboard.sort((a, b) => b.xp - a.xp);

        return { 
            success: true, 
            topUsers: leaderboard.slice(0, 5), 
            totalFilled 
        };
    } catch (err: any) {
        console.error("Error in getGiveawayLeaderboard:", err);
        return { success: false, error: err.message };
    }
}


