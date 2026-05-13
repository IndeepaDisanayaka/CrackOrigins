'use server';

import { getMongoDb } from '../mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

async function checkAdmin(adminUid: string) {
  if (!adminUid) return false;
  try {
    const db = await getMongoDb();
    const user = await db.collection('accounts').findOne({ uid: adminUid });
    
    if (!user) return false;

    const isAuthorized = 
        user.isOwner === true || 
        user.owner === true || 
        user.role?.toLowerCase() === 'admin' || 
        user.role?.toLowerCase() === 'owner' ||
        !!user.ruleId;

    return !!isAuthorized;
  } catch (error) {
    console.error("checkAdmin error:", error);
    return false;
  }
}

export async function createLicense(adminUid: string, licenseData: any) {
  if (!await checkAdmin(adminUid)) {
    return { success: false, error: "Unauthorized access to studio vault." };
  }

  try {
    const db = await getMongoDb();
    const newLicense = {
      ...licenseData,
      createdAt: new Date().toISOString(),
      generatedBy: adminUid,
      status: 'active'
    };

    const result = await db.collection('licenses').insertOne(newLicense);
    
    revalidatePath('/ideas');
    revalidatePath('/account');
    
    return { success: true, id: result.insertedId.toString() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLicenses(adminUid: string) {
  if (!await checkAdmin(adminUid)) {
    return { success: false, error: "Unauthorized access to studio vault." };
  }

  try {
    const db = await getMongoDb();
    const licenses = await db.collection('licenses').find({}).sort({ createdAt: -1 }).toArray();
    
    return { 
      success: true, 
      licenses: JSON.parse(JSON.stringify(licenses)) 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteLicense(adminUid: string, licenseId: string) {
    if (!await checkAdmin(adminUid)) {
        return { success: false, error: "Unauthorized access to studio vault." };
    }
    
    try {
        const db = await getMongoDb();
        await db.collection('licenses').deleteOne({ _id: new ObjectId(licenseId) });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getLicenseByCode(code: string) {
    try {
        const db = await getMongoDb();
        const license = await db.collection('licenses').findOne({ code });
        if (!license) return { success: false, error: "License not found" };
        return { success: true, license: JSON.parse(JSON.stringify(license)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
