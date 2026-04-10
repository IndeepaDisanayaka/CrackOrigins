import { getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin safely for Server Side logic
 */
export async function getAdminDb() {
    // Modular dynamic imports to solve Next.js constructor errors
    const { initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    const apps = getApps();
    if (!apps.length) {
        try {
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
            });
            
            console.log("Firebase Admin initialized securely.");
        } catch (error) {
            console.error("Firebase Admin initialization error:", error);
            throw error;
        }
    }
    return getFirestore();
}
