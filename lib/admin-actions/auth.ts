"use server";

import { getMongoDb } from '../mongodb';
import { hasPermission } from './rules';

export async function getAuthCodes(adminUid: string) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canRead = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'games', 'READ'));

        if (!userDoc || !canRead) {
            return { success: false, error: "Unauthorized." };
        }

        const codes = await db.collection("auth_codes")
            .find()
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        return { 
            success: true, 
            codes: codes.map(c => ({
                id: c._id.toString(),
                email: c.email,
                code: c.code,
                createdAt: c.createdAt.toISOString(),
                expiresAt: c.expiresAt.toISOString(),
                used: c.used || false
            }))
        };
    } catch (error: any) {
        console.error("Error fetching auth codes:", error);
        return { success: false, error: error.message };
    }
}

export async function clearAuthCodes(adminUid: string, type: 'expired' | 'all') {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canDelete = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'games', 'DELETE'));

        if (!userDoc || !canDelete) {
            return { success: false, error: "Unauthorized." };
        }

        const query = type === 'expired' ? { expiresAt: { $lt: new Date() } } : {};
        const result = await db.collection("auth_codes").deleteMany(query);

        return { success: true, count: result.deletedCount };
    } catch (error: any) {
        console.error("Error clearing auth codes:", error);
        return { success: false, error: error.message };
    }
}
