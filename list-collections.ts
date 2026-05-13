
import { getMongoDb } from './lib/mongodb';

async function listCollections() {
    try {
        const db = await getMongoDb();
        const collections = await db.listCollections().toArray();
        console.log("Collections in DB:");
        console.log(collections.map(c => c.name));
        process.exit(0);
    } catch (err) {
        console.error("Error listing collections:", err);
        process.exit(1);
    }
}

listCollections();
