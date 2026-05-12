"use server";

import { getMongoDb } from '../mongodb';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function validateCoupon(couponCode: string) {
    try {
        const db = await getMongoDb();
        const data = await db.collection("coupons").findOne({ _id: couponCode as any });
 
        if (!data) return { success: false, error: "Invalid coupon code." };
 
        if (data.isExpired === true || data.quantity <= 0) {
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
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        if (!userDoc || !userDoc.isOwner) {
            return { success: false, error: "Unauthorized." };
        }

        const couponCode = Math.random().toString(36).substring(2, 18).toUpperCase();

        await db.collection("coupons").insertOne({
            _id: couponCode as any,
            ...couponData,
            createdAt: new Date(),
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
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid });
        if (!userDoc) return { success: false, error: "User not found." };
        
        const xpVal = userDoc.xp ?? userDoc.discount ?? 0;
        if (xpVal <= 0) return { success: false, error: "No XP available." };

        const couponCode = `REF-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
        const expireDate = new Date();
        expireDate.setFullYear(expireDate.getFullYear() + 1);

        await db.collection("coupons").insertOne({
            _id: couponCode as any,
            name: `Affiliate Reward (${userDoc.name})`,
            discount: `${xpVal} XP`,
            quantity: 1,
            expire: expireDate.toISOString().split('T')[0],
            createdAt: new Date(),
            isExpired: false,
            userId: uid
        });

        await db.collection("accounts").updateOne(
            { uid },
            { $set: { xp: 0, discount: 0 } }
        );
        return { success: true, couponCode };
    } catch (error: any) {
        console.error("Error generating affiliate coupon:", error);
        return { success: false, error: error.message };
    }
}

export async function getUserCoupons(uid: string) {
    try {
        const db = await getMongoDb();
        const docs = await db.collection("coupons").find({ userId: uid }).toArray();
        
        const coupons = docs.map((data: any) => {
            return {
                code: data._id,
                ...data,
                createdAt: toIsoDate(data.createdAt)
            };
        });
        
        return { success: true, coupons };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function verifyCoupon(couponCode: string) {
    try {
        const db = await getMongoDb();
        const code = couponCode.toUpperCase();
        const data = await db.collection("coupons").findOne({ _id: code as any });
        
        if (!data) return { success: false, error: "Invalid coupon code." };
        
        if (data.isExpired) return { success: false, error: "Coupon has expired." };
        if (data.quantity <= 0) return { success: false, error: "Coupon is no longer available." };
        
        const expireDate = new Date(data.expire);
        if (expireDate < new Date()) {
            await db.collection("coupons").updateOne({ _id: code as any }, { $set: { isExpired: true } });
            return { success: false, error: "Coupon has expired." };
        }

        return { 
            success: true, 
            discount: data.discount,
            couponId: data._id.toString()
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

