
import { getAdminDb } from "../lib/firebase-admin";

async function checkOffers() {
    try {
        const db = await getAdminDb();
        const snap = await db.collection("offers").get();
        console.log("Found", snap.size, "offers.");
        snap.forEach(doc => {
            console.log("ID:", doc.id, "Title:", doc.data().title, "Variant ID:", doc.data().lemonVariantId);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

checkOffers();
