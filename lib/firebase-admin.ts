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

import { FirestoreToMongoAdapter } from './firestore-to-mongo-adapter';

export interface AdminDb {
    collection(name: string): CollectionRef;
    collectionGroup(name: string): CollectionRef;
    batch(): Batch;
}
export interface CollectionRef {
    doc(id?: string): DocRef;
    add(data: any): Promise<DocRef>;
    where(f: string, op: string, v: any): Query;
    orderBy(f: string, dir?: string): Query;
    limit(n: number): Query;
    get(): Promise<QuerySnap>;
}
export interface Query {
    where(f: string, op: string, v: any): Query;
    orderBy(f: string, dir?: string): Query;
    limit(n: number): Query;
    get(): Promise<QuerySnap>;
}
export interface DocRef {
    id: string;
    path: string;
    collection(name: string): CollectionRef;
    get(): Promise<DocSnap>;
    set(data: any, options?: any): Promise<void>;
    update(data: any): Promise<void>;
    delete(): Promise<void>;
}
export interface QuerySnap {
    empty: boolean;
    size: number;
    docs: DocSnap[];
    forEach(cb: (doc: DocSnap) => void): void;
}
export interface DocSnap {
    id: string;
    ref: DocRef;
    exists: boolean;
    data(): any;
}
export interface Batch {
    set(ref: DocRef, data: any, options?: any): void;
    update(ref: DocRef, data: any): void;
    delete(ref: DocRef): void;
    commit(): Promise<void>;
}

export async function getAdminDb(): Promise<AdminDb> {
    // We seamlessly route all admin Firestore requests to MongoDB using the adapter!
    return new FirestoreToMongoAdapter() as any;
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
