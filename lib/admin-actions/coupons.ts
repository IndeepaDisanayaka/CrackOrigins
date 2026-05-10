"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function validateCoupon(couponCode: string) {
    try {
        const adminDb = await getAdminDb();
        const couponRef = adminDb.collection("coupons").doc(couponCode);
        const couponDoc = await couponRef.get();

        if (!couponDoc.exists) return { success: false, error: "Invalid coupon code." };

        const data = couponDoc.data();
        if (!data || data.isExpired === true || data.quantity <= 0) {
            return { success: false, error: "Coupon expired or unavailable." };
        }

        if (data.expire) {
            const expireDate = new Date(data.expire);
            if (data.expire.length <= 10) expireDate.setHours(23, 59, 59, 999);
            if (expireDate < new Date()) return { success: false, error: "This coupon has expired." };
        }

        return {
            success: true,
            coupon: {
                code: couponCode,
                name: data.name,
                discount: data.discount,
                quantity: data.quantity,
                expire: data.expire,
            }
        };
    } catch (error: any) {
        console.error("Error validating coupon:", error);
        return { success: false, error: "Failed to validate coupon." };
    }
}

export async function createCoupon(adminUid: string, couponData: {
    name: string;
    discount: string;
    quantity: number;
    expire: string;
}) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        if (!userDoc.exists || !userDoc.data()?.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        const couponCode = Math.random().toString(36).substring(2, 18).toUpperCase();

        await adminDb.collection("coupons").doc(couponCode).set({
            ...couponData,
            createdAt: Timestamp.now(),
            isExpired: false,
        });

        return { success: true, couponCode };
    } catch (error: any) {
        console.error("Error creating coupon:", error);
        return { success: false, error: error.message };
    }
}

export async function generateAffiliateCoupon(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const userRef = adminDb.collection("accounts").doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) return { success: false, error: "User not found." };
        
        const data = userDoc.data()!;
        const xpVal = data.xp ?? data.discount ?? 0;
        if (xpVal <= 0) return { success: false, error: "No XP available." };

        const couponCode = `REF-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + 1);

        await adminDb.collection("coupons").doc(couponCode).set({
            name: `Affiliate Reward (${data.name})`,
            discount: `${xpVal} XP`,
            quantity: 1,
            expire: expireDate.toISOString().split('T')[0],
            createdAt: Timestamp.now(),
            isExpired: false,
            userId: uid
        });

        await userRef.update({ xp: 0, discount: 0 });
        return { success: true, couponCode };
    } catch (error: any) {
        console.error("Error generating affiliate coupon:", error);
        return { success: false, error: error.message };
    }
}

export async function getUserCoupons(uid: string) {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("coupons").where("userId", "==", uid).get();
        
        const coupons: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            coupons.push({
                code: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || null
            });
        });
        
        return { success: true, coupons };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function verifyCoupon(couponCode: string) {
    try {
        const adminDb = await getAdminDb();
        const doc = await adminDb.collection("coupons").doc(couponCode.toUpperCase()).get();
        
        if (!doc.exists) return { success: false, error: "Invalid coupon code." };
        
        const data = doc.data()!;
        if (data.isExpired) return { success: false, error: "Coupon has expired." };
        if (data.quantity <= 0) return { success: false, error: "Coupon is no longer available." };
        
        const expireDate = new Date(data.expire);
        if (expireDate < new Date()) {
            await adminDb.collection("coupons").doc(couponCode.toUpperCase()).update({ isExpired: true });
            return { success: false, error: "Coupon has expired." };
        }

        return { 
            success: true, 
            discount: data.discount,
            couponId: doc.id 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

