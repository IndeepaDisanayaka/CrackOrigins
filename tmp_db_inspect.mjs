
import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb+srv://indeepadisanayaka_db_user:WYjCqlDWubo67PJn@crack-origins-cluster.6piprc2.mongodb.net/crack-origins-db?appName=crack-origins-cluster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const db = client.db('crack-origins-db');
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      const sample = await db.collection(col.name).findOne();
      console.log(`- ${col.name}: ${count} docs`);
      // console.log(`  Sample:`, JSON.stringify(sample, null, 2).substring(0, 200));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
