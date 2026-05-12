"use server";

import { getMongoDb } from '../mongodb';
import * as Types from './types';
import { ObjectId } from 'mongodb';

export async function getRewardLevels() {
    try {
        const db = await getMongoDb();
        const docs = await db.collection("reward_levels").find().sort({ min_xp: 1 }).toArray();
        return docs.map((d: any) => ({ id: d._id.toString(), ...d })) as Types.RewardLevel[];
    } catch (err: any) {
        return [];
    }
}

export async function saveRewardLevel(adminUid: string, levelData: any) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) return { success: false, error: "Unauthorized." };

        const { id, ...data } = levelData;
        if (id) {
            let objId: any = id;
            try { objId = new ObjectId(id); } catch {}
            await db.collection("reward_levels").updateOne({ _id: objId }, { $set: data }, { upsert: true });
        } else {
            await db.collection("reward_levels").insertOne(data);
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteRewardLevel(adminUid: string, levelId: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) return { success: false, error: "Unauthorized." };

        let objId: any = levelId;
        try { objId = new ObjectId(levelId); } catch {}
        await db.collection("reward_levels").deleteOne({ _id: objId });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateUserLevel(uid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid });
        if (!userDoc) return;

        const currentXP = userDoc.xp ?? userDoc.discount ?? 0;

        const docs = await db.collection("reward_levels").find().sort({ min_xp: -1 }).toArray();
        let newLevel = "starter";
        
        for (const level of docs) {
            if (currentXP >= (level.min_xp || 0)) {
                newLevel = level.title;
                break;
            }
        }

        await db.collection("accounts").updateOne({ uid }, { $set: { affiliateLevel: newLevel } });
    } catch (err) {}
}

