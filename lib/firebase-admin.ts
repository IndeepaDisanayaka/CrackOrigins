import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin safely for Server Side logic (shared by Firestore + Auth).
 */
export async function ensureFirebaseAdminInitialized() {
    const { initializeApp, cert } = await import('firebase-admin/app');

    const apps = getApps();
    if (apps.length) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Missing Firebase Admin credentials in .env.local (Ensure they don't have NEXT_PUBLIC_ prefix)");
    }

    initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
        databaseURL: "https://crack-origins-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
    console.log("Firebase Admin initialized securely.");
}

export async function getAdminDb() {
    const { getFirestore } = await import('firebase-admin/firestore');
    await ensureFirebaseAdminInitialized();
    return getFirestore();
}

export async function getAdminRtdb() {
    const { getDatabase } = await import('firebase-admin/database');
    await ensureFirebaseAdminInitialized();
    return getDatabase();
}

/** Returns Firebase Auth UID for a valid client ID token (server-only). */
export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
    await ensureFirebaseAdminInitialized();
    const { getAuth } = await import('firebase-admin/auth');
    const decoded = await getAuth().verifyIdToken(idToken);
    return decoded.uid;
}
