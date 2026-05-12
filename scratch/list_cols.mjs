import { getMongoDb } from './lib/mongodb.js';

async function listCols() {
  try {
    const db = await getMongoDb();
    const cols = await db.listCollections().toArray();
    console.log("Collections:", cols.map(c => c.name));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

listCols();
