"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from '../firebase-admin';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function upsertAccountRule(adminUid: string, ruleData: { id?: string, title: string, description: string, rules: Record<string, string[]> }) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Only the owner can manage rules." };
        }

        const { id, ...data } = ruleData;
        const ruleRef = id ? adminDb.collection("account_rules").doc(id) : adminDb.collection("account_rules").doc();
        
        const payload: any = {
            ...data,
            last_update: Timestamp.now(),
        };
        if (!id) {
            payload.created = Timestamp.now();
        }

        await ruleRef.set(payload, { merge: true });

        return { success: true, id: ruleRef.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAccountRule(adminUid: string, ruleId: string) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        await adminDb.collection("account_rules").doc(ruleId).delete();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAccountRules(adminUid: string) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || (!userDoc.data()?.isOwner && !userDoc.data()?.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        const snapshot = await adminDb.collection("account_rules").get();
        const rules = snapshot.docs.map((doc: any) => {
            const data = doc.data() as any;
            return { 
                id: doc.id, 
                ...data,
                last_update: data.last_update?.toDate ? data.last_update.toDate().toISOString() : data.last_update,
                created: data.created?.toDate ? data.created.toDate().toISOString() : data.created
            };
        });
        return { success: true, rules };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function hasPermission(adminUid: string, collection: string, action: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE') {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        
        if (!userDoc.exists) return false;
        const userData = userDoc.data();
        
        // Owner has all permissions
        if (userData?.isOwner) return true;
        
        // Check for assigned rule
        const ruleId = userData?.ruleId;
        if (!ruleId) return false;
        
        const ruleDoc = await adminDb.collection("account_rules").doc(ruleId).get();
        if (!ruleDoc.exists) return false;
        
        const ruleData = ruleDoc.data();
        const permissions = ruleData?.rules?.[collection] || [];
        
        return permissions.includes(action);
    } catch (err) {
        console.error("Permission check error:", err);
        return false;
    }
}

