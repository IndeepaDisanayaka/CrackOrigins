"use server";

import { getMongoDb } from '../mongodb';
import { toIsoDate } from './helpers';
import * as Types from './types';
import { ObjectId } from 'mongodb';

export async function upsertAccountRule(adminUid: string, ruleData: { id?: string, title: string, description: string, rules: Record<string, string[]> }) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) {
            return { success: false, error: "Only the owner can manage rules." };
        }

        const { id, ...data } = ruleData;
        const payload: any = {
            ...data,
            last_update: new Date(),
        };

        if (id) {
            let objId: any = id;
            try { objId = new ObjectId(id); } catch {}
            await db.collection("account_rules").updateOne(
                { _id: objId },
                { $set: payload },
                { upsert: true }
            );
            return { success: true, id };
        } else {
            payload.created = new Date();
            const res = await db.collection("account_rules").insertOne(payload);
            return { success: true, id: res.insertedId.toString() };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAccountRule(adminUid: string, ruleId: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        let objId: any = ruleId;
        try { objId = new ObjectId(ruleId); } catch {}
        await db.collection("account_rules").deleteOne({ _id: objId });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAccountRules(adminUid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || (!userDoc.isOwner && !userDoc.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        const docs = await db.collection("account_rules").find().toArray();
        const rules = docs.map((data: any) => {
            return { 
                id: data._id.toString(), 
                ...data,
                last_update: toIsoDate(data.last_update),
                created: toIsoDate(data.created)
            };
        });
        return { success: true, rules };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function hasPermission(adminUid: string, collection: string, action: 'READ' | 'WRITE' | 'UPDATE' | 'DELETE') {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        
        if (!userDoc) return false;
        
        if (userDoc.isOwner) return true;
        
        const ruleId = userDoc.ruleId;
        if (!ruleId) return false;
        
        let objId: any = ruleId;
        try { objId = new ObjectId(ruleId); } catch {}
        const ruleDoc = await db.collection("account_rules").findOne({ _id: objId });
        if (!ruleDoc) return false;
        
        const permissions = ruleDoc.rules?.[collection] || [];
        return permissions.includes(action);
    } catch (err) {
        console.error("Permission check error:", err);
        return false;
    }
}
