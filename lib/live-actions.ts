"use server";

import { getAdminDb } from './firebase-admin';

/**
 * Fetch marketplace offers from Firestore using Admin SDK (bypasses rules)
 */
export async function getGlobalOffers() {
    try {
        const adminDb = await getAdminDb();
        const snap = await adminDb.collection("offers").get();
        
        const offers = snap.docs.map(d => {
            const data = d.data();
            
            let discountPercent = 0;
            if (typeof data.discount === 'string') {
              discountPercent = Number(data.discount.replace('%', '').replace('-', ''));
            } else if (typeof data.discount === 'number') {
              discountPercent = data.discount;
            }
            const originalPrice = Number(data.originalPrice || 0);
            const discountPrice = isNaN(discountPercent) ? originalPrice : originalPrice - (originalPrice * discountPercent / 100);

            const toDateStr = (field: any) => {
                if (!field) return new Date().toISOString();
                if (typeof field.toDate === 'function') return field.toDate().toISOString();
                if (field.seconds) return new Date(field.seconds * 1000).toISOString();
                return new Date(field).toISOString();
            };

            const steamAppId = data.gameUrl?.match(/\/app\/(\d+)/)?.[1] || d.id;

            return {
              id: d.id,
              title: data.title || 'Unknown Game',
              originalPrice: `$${originalPrice.toFixed(2)}`,
              discountPrice: `$${discountPrice.toFixed(2)}`,
              discount: (typeof data.discount === 'string' && data.discount.includes('-')) ? data.discount : `-${discountPercent}%`,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`,
              platforms: data.operatingSystem ? [String(data.operatingSystem).toLowerCase()] : ['windows'],
              steamUrl: data.gameUrl || `https://store.steampowered.com/app/${steamAppId}/`,
              endTime: toDateStr(data.expire),
              listed: toDateStr(data.listed),
              targetXP: Number(data.targetXP || data.targetAffiliates || 10),
              quantity: Number(data.quantity || 0),
              steamAppId: steamAppId,
              offerScope: data.offerScope || 'local',
            };
        });

        return offers.filter(o => {
            const expireTime = new Date(o.endTime).getTime();
            return !isNaN(expireTime) && expireTime > Date.now();
        }).sort((a, b) => {
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
        const adminDb = await getAdminDb();
        
        // Fetch all investments for this specific offer
        const investmentsSnap = await adminDb.collection("offers").doc(offerId).collection("investments").get();

        const userMap = new Map<string, { uid: string, displayName: string, xp: number, photoURL?: string }>();
        let totalFilled = 0;

        investmentsSnap.forEach(d => {
            const data = d.data();
            const xp = Number(data.xp || data.points || 0);
            const uid = data.uid || d.id; 
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



        // Sort by XP descending
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


