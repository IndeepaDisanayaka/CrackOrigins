const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'd:/javaScript/ai/crackorigins-v2/.env.local' });

async function run() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        const collections = await db.listCollections().toArray();
        const names = collections.map(c => c.name);
        console.log("COLLECTIONS_START");
        names.forEach(n => console.log("COL:" + n));
        console.log("COLLECTIONS_END");
        
        const rewards = await db.collection('reward_levels').find().toArray();
        console.log("REWARDS_COUNT:" + rewards.length);
        
    } finally {
        await client.close();
    }
}
run();
