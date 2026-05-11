
import { MongoClient } from 'mongodb';
const MONGODB_URI = "mongodb+srv://indeepadisanayaka_db_user:WYjCqlDWubo67PJn@crack-origins-cluster.6piprc2.mongodb.net/crack-origins-db?appName=crack-origins-cluster";

async function run() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('crack-origins-db');
    const collectionsToRemove = [
        'presence',
        'presence_status',
        'idea_creator_sections',
        'idea_collaborations'
    ];
    
    for (const name of collectionsToRemove) {
        const count = await db.collection(name).countDocuments();
        if (count === 0 || name.startsWith('presence')) {
            console.log(`Removing collection: ${name} (${count} docs)`);
            await db.collection(name).drop().catch(e => console.log(`Could not drop ${name}: ${e.message}`));
        }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
