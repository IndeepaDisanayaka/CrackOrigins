import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }
  
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGODB_URI as string);
    await cachedClient.connect();
  }
  
  cachedDb = cachedClient.db('crack-origins-db');
  return cachedDb;
}
export async function getCollection(name: string) {
    const db = await getMongoDb();
    return db.collection(name);
}

export default getMongoDb;
