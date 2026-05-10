"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function deleteBlogPost(adminUid: string, slug: string) {
    try {
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const adminData = adminDoc.data();
        const canDelete = adminData?.isOwner || (adminData?.ruleId && await hasPermission(adminUid, 'blogs', 'DELETE'));
        
        if (!adminDoc.exists || !canDelete) return { success: false, error: "Unauthorized." };

        // Find document by slug field since doc ID is now auto-generated
        const blogQuery = await adminDb.collection('blogs').where('slug', '==', slug).limit(1).get();
        
        if (blogQuery.empty) return { success: false, error: "Post not found." };
        
        const blogDoc = blogQuery.docs[0];
        const blogRef = blogDoc.ref;
        
        // Delete all contents in the sub-collection first
        const contentsSnapshot = await blogRef.collection('contents').get();
        const batch = adminDb.batch();
        contentsSnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        // Delete the main blog document
        batch.delete(blogRef);
        
        await batch.commit();
        
        try {
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/blog');
            revalidatePath(`/blog/${slug}`);
        } catch (e) {
            console.error('Revalidation failed:', e);
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting blog post from Firestore:", error);
        return { success: false, error: error.message };
    }
}

export async function getBlogPostsAction() {
    try {
        const posts = await getBlogPosts();
        return { success: true, posts };
    } catch (error: any) {
        console.error("Error fetching blogs in action:", error);
        return { success: false, error: error.message };
    }
}

