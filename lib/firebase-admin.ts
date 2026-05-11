/**
 * Firebase Admin Stub
 * This file allows the application to continue using the 'FirestoreToMongoAdapter'
 * without requiring the 'firebase-admin' package.
 */
import { FirestoreToMongoAdapter } from './firestore-to-mongo-adapter';

export async function ensureFirebaseAdminInitialized() {
    return; // No-op
}

export const Timestamp = {
    now: () => {
        const now = Date.now();
        return { 
            seconds: Math.floor(now / 1000), 
            nanoseconds: (now % 1000) * 1e6
        };
    },
    fromDate: (date: Date) => {
        const ms = date.getTime();
        return { 
            seconds: Math.floor(ms / 1000), 
            nanoseconds: (ms % 1000) * 1e6
        };
    },
    fromMillis: (ms: number) => {
        return { 
            seconds: Math.floor(ms / 1000), 
            nanoseconds: (ms % 1000) * 1e6
        };
    }
} as any;

export class FieldValue {
    static increment(n: number) {
        return { _type: 'increment', value: n };
    }
    static serverTimestamp() {
        return Timestamp.now();
    }
    static arrayUnion(...elements: any[]) {
        return { _type: 'arrayUnion', value: elements };
    }
    static arrayRemove(...elements: any[]) {
        return { _type: 'arrayRemove', value: elements };
    }
}

export async function getAdminDb() {
    return new FirestoreToMongoAdapter() as any;
}

export async function getAdminRtdb() {
    return null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<string> {
    throw new Error("verifyFirebaseIdToken: Firebase Admin is decommissioned.");
}

export async function getAuth() {
    return {
        listUsers: async () => ({ users: [] }),
        deleteUser: async () => {},
        verifyIdToken: async () => { throw new Error("Auth module decommissioned"); }
    } as any;
}
