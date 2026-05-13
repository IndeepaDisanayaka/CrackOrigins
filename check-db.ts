
import { getMongoDb } from './lib/mongodb';

async function checkOffers() {
    try {
        const db = await getMongoDb();
        const offers = await db.collection("offers").find().toArray();
        console.log("Current Offers in DB:");
        console.log(JSON.stringify(offers, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error checking offers:", err);
        process.exit(1);
    }
}

checkOffers();
