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
