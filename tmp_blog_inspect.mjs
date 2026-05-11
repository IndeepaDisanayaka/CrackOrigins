
import { MongoClient, ObjectId } from 'mongodb';
const MONGODB_URI = "mongodb+srv://indeepadisanayaka_db_user:WYjCqlDWubo67PJn@crack-origins-cluster.6piprc2.mongodb.net/crack-origins-db?appName=crack-origins-cluster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('crack-origins-db');
    const blog = await db.collection('blogs').findOne();
    console.log("Blog Sample:", JSON.stringify(blog, null, 2));
    
    // Check if there are ANY documents in other potential names
    const names = ['contents', 'blog_contents', 'content'];
    for (const name of names) {
        const count = await db.collection(name).countDocuments();
        console.log(`${name} count: ${count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
