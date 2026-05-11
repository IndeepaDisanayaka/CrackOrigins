"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from '../firebase-admin';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function getRewardLevels() {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("reward_levels").orderBy("min_xp", "asc").get();
        return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Types.RewardLevel[];
    } catch (err: any) {
        return [];
    }
}

export async function saveRewardLevel(adminUid: string, levelData: any) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        const { id, ...data } = levelData;
        const levelRef = id ? adminDb.collection("reward_levels").doc(id) : adminDb.collection("reward_levels").doc();
        await levelRef.set(data, { merge: true });
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function deleteRewardLevel(adminUid: string, levelId: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) return { success: false, error: "Unauthorized." };

        await adminDb.collection("reward_levels").doc(levelId).delete();
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function updateUserLevel(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return;

        const userData = userDoc.data()!;
        const currentXP = userData.xp ?? userData.discount ?? 0; // Support both fields during transition

        const levelsSnap = await adminDb.collection("reward_levels").orderBy("min_xp", "desc").get();
        let newLevel = "starter";
        
        for (const d of levelsSnap.docs) {
            const level = d.data();
            if (currentXP >= (level.min_xp || 0)) {
                newLevel = level.title;
                break; // Found the highest level
            }
        }


        await userRef.update({ affiliateLevel: newLevel });
    } catch (err) {}
}

