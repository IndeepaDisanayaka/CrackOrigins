"use server";

import { getAdminDb } from './firebase-admin';

/**
 * Fetch real historical transactions from Firestore to show as "Live Activity"
 * if the real-time database is empty.
 */
export async function getRealActivity() {
    try {
        const adminDb = await getAdminDb();
        const accountsSnap = await adminDb.collection("accounts").get();
        
        const allTransactions: any[] = [];
        
        await Promise.all(
            accountsSnap.docs.map(async (accountDoc) => {
                const userData = accountDoc.data();
                const userName = userData?.name || "Comrade";
                const userRef = accountDoc.ref;

                const [paymentsSnap, offersSnap] = await Promise.all([
                    userRef.collection("payments").limit(5).get(),
                    userRef.collection("offers").limit(5).get()
                ]);

                paymentsSnap.forEach(doc => {
                    const data = doc.data();
                    allTransactions.push({
                        id: doc.id,
                        gameName: data.game || "Unknown Mission",
                        userName: userName,
                        amount: data.amount || "0",
                        status: data.status || "COMPLETED",
                        timestamp: data.purchaseDate?.toDate?.()?.getTime() || Date.now(),
                        type: "STANDARD_PURCHASE"
                    });
                });

                offersSnap.forEach(doc => {
                    const data = doc.data();
                    allTransactions.push({
                        id: doc.id,
                        gameName: data.game || "Special Offer",
                        userName: userName,
                        amount: data.amount || "0",
                        status: data.status || "COMPLETED",
                        timestamp: data.purchaseDate?.toDate?.()?.getTime() || Date.now(),
                        type: "SPECIAL_OFFER"
                    });
                });
            })
        );

        // Sort by timestamp desc and take latest 10
        return allTransactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
            
    } catch (error) {
        console.error("Error fetching real activity:", error);
        return [];
    }
}

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

            return {
              id: d.id,
              title: data.title || 'Unknown Game',
              originalPrice: `$${originalPrice.toFixed(2)}`,
              discountPrice: `$${discountPrice.toFixed(2)}`,
              discount: (typeof data.discount === 'string' && data.discount.includes('-')) ? data.discount : `-${discountPercent}%`,
              image: `https://cdn.akamai.steamstatic.com/steam/apps/${d.id}/header.jpg`,
              platforms: data.operatingSystem ? [String(data.operatingSystem).toLowerCase()] : ['windows'],
              steamUrl: data.gameUrl || `https://store.steampowered.com/app/${d.id}/`,
              endTime: toDateStr(data.expire),
              listed: toDateStr(data.listed),
              targetAffiliates: Number(data.targetAffiliates || 10),
              quantity: Number(data.quantity || 0),
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
