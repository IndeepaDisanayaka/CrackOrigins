
import { MongoClient } from 'mongodb';
const MONGODB_URI = "mongodb+srv://indeepadisanayaka_db_user:WYjCqlDWubo67PJn@crack-origins-cluster.6piprc2.mongodb.net/crack-origins-db?appName=crack-origins-cluster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('crack-origins-db');
    const user = await db.collection('accounts').findOne();
    console.log("User Sample:", JSON.stringify(user, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
