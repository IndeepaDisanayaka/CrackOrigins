"use server";

import { getMongoDb } from '../mongodb';
import { syncUserRecord, normalizeEmail, hashEmail } from './users';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function emailSignup(data: { email: string, password: string, referralId?: string | null }) {
    try {
        const db = await getMongoDb();
        const accountsCol = db.collection('accounts');

        const normalizedEmail = await normalizeEmail(data.email);
        const existing = await accountsCol.findOne({ emailHash: await hashEmail(normalizedEmail) });

        if (existing) {
            return { success: false, error: "An account with this email already exists." };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const uid = crypto.randomUUID();

        const syncRes = await syncUserRecord(uid, {
            isOwner: false,
            name: normalizedEmail.split('@')[0],
            email: normalizedEmail,
            photoURL: null,
            created: new Date().toISOString(),
            last: new Date().toISOString(),
            referralId: data.referralId,
            emailVerified: false
        });

        if (!syncRes.success) return syncRes;

        // Save password
        await accountsCol.updateOne({ uid }, { $set: { password: hashedPassword } });

        return { success: true };
    } catch (error: any) {
        console.error("Error in emailSignup:", error);
        return { success: false, error: error.message };
    }
}
