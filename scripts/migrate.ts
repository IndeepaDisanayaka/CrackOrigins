import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { MongoClient } from 'mongodb';

// Load env vars
require('dotenv').config({ path: '.env.local' });

// Add your Firebase service account key JSON here for migration or load from env
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

const mongoUri = "mongodb+srv://indeepadisanayaka_db_user:WYjCqlDWubo67PJn@crack-origins-cluster.6piprc2.mongodb.net/crack-origins-db?appName=crack-origins-cluster";

async function run() {
    console.log("Starting migration...");
    
    // 1. Initialize Firebase
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error("Missing Firebase credentials.");
        }

        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
    }
    const firestore = getFirestore();

    // 2. Initialize MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db('crack-origins-db');
    
    // Helper to process Timestamps
    const processData = (data: any) => {
        const result = { ...data };
        for (const key in result) {
            if (result[key] && typeof result[key] === 'object' && 'toDate' in result[key]) {
                result[key] = result[key].toDate();
            }
        }
        return result;
    };

    const migrateCollection = async (collectionName: string) => {
        console.log(`Migrating ${collectionName}...`);
        const snapshot = await firestore.collection(collectionName).get();
        const docs = snapshot.docs.map(doc => {
            return {
                _id: doc.id,
                ...processData(doc.data())
            };
        });
        
        if (docs.length > 0) {
            const collection = db.collection(collectionName);
            // Drop existing to avoid duplicates if running multiple times
            try { await collection.drop(); } catch (e) {}
            await collection.insertMany(docs);
            console.log(`Migrated ${docs.length} documents to ${collectionName}`);
        } else {
            console.log(`No documents found in ${collectionName}`);
        }
    };

    // Main collections
    await migrateCollection('accounts');
    await migrateCollection('games');
    await migrateCollection('offers');
    await migrateCollection('coupons');
    await migrateCollection('ideas');
    await migrateCollection('reward_levels');
    await migrateCollection('account_rules');
    await migrateCollection('blogs');
    
    // Subcollections migration
    // Accounts -> payments, affiliates, offers
    console.log("Migrating accounts subcollections...");
    const accountsSnap = await firestore.collection('accounts').get();
    
    const allPayments: any[] = [];
    const allUserOffers: any[] = [];
    const allAffiliates: any[] = [];
    
    for (const userDoc of accountsSnap.docs) {
        const uid = userDoc.id;
        
        const paymentsSnap = await userDoc.ref.collection('payments').get();
        paymentsSnap.forEach(doc => {
            allPayments.push({
                _id: `${uid}_${doc.id}`,
                paymentId: doc.id,
                userId: uid, // Add top-level link
                ...processData(doc.data())
            });
        });
        
        const offersSnap = await userDoc.ref.collection('offers').get();
        offersSnap.forEach(doc => {
            allUserOffers.push({
                _id: `${uid}_${doc.id}`,
                offerId: doc.id,
                userId: uid,
                ...processData(doc.data())
            });
        });
        
        const affiliatesSnap = await userDoc.ref.collection('affiliates').get();
        affiliatesSnap.forEach(doc => {
            allAffiliates.push({
                _id: `${uid}_${doc.id}`,
                affiliateId: doc.id,
                inviterId: uid,
                ...processData(doc.data())
            });
        });
    }
    
    if (allPayments.length > 0) {
        try { await db.collection('payments').drop(); } catch(e){}
        await db.collection('payments').insertMany(allPayments);
        console.log(`Migrated ${allPayments.length} payments.`);
    }
    
    if (allUserOffers.length > 0) {
        try { await db.collection('user_offers').drop(); } catch(e){}
        await db.collection('user_offers').insertMany(allUserOffers);
        console.log(`Migrated ${allUserOffers.length} user_offers.`);
    }
    
    if (allAffiliates.length > 0) {
        try { await db.collection('affiliates').drop(); } catch(e){}
        await db.collection('affiliates').insertMany(allAffiliates);
        console.log(`Migrated ${allAffiliates.length} affiliates.`);
    }

    // Ideas -> creator, collaborations
    console.log("Migrating ideas subcollections...");
    const ideasSnap = await firestore.collection('ideas').get();
    const allCreatorSections: any[] = [];
    const allCollabSections: any[] = [];
    
    for (const ideaDoc of ideasSnap.docs) {
        const ideaId = ideaDoc.id;
        
        const creatorSnap = await ideaDoc.ref.collection('creator').get();
        creatorSnap.forEach(doc => {
            allCreatorSections.push({
                _id: doc.id,
                ideaId: ideaId,
                ...processData(doc.data())
            });
        });
        
        const collabSnap = await ideaDoc.ref.collection('collaborations').get();
        collabSnap.forEach(doc => {
            allCollabSections.push({
                _id: doc.id,
                ideaId: ideaId,
                ...processData(doc.data())
            });
        });
    }
    
    if (allCreatorSections.length > 0) {
        try { await db.collection('idea_creator_sections').drop(); } catch(e){}
        await db.collection('idea_creator_sections').insertMany(allCreatorSections);
        console.log(`Migrated ${allCreatorSections.length} idea_creator_sections.`);
    }
    if (allCollabSections.length > 0) {
        try { await db.collection('idea_collaborations').drop(); } catch(e){}
        await db.collection('idea_collaborations').insertMany(allCollabSections);
        console.log(`Migrated ${allCollabSections.length} idea_collaborations.`);
    }

    console.log("Migration complete!");
    await client.close();
    process.exit(0);
}

run().catch(console.error);
