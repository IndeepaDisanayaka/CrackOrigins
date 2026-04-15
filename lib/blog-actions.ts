"use server";

import { getAdminDb } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
export async function incrementBlogViews(blogId: string) {
    try {
        const db = await getAdminDb();
        const blogRef = db.collection('blogs').doc(blogId);
        
        await blogRef.update({
            'status.views': FieldValue.increment(1)
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing views:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle blog likes (Simple increment/decrement)
 */
export async function toggleBlogLikeSimple(blogId: string, increment: boolean) {
    try {
        const db = await getAdminDb();
        const blogRef = db.collection('blogs').doc(blogId);
        
        await blogRef.update({
            'status.likes': FieldValue.increment(increment ? 1 : -1)
        });
        
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling like:", error);
        return { success: false, error: error.message };
    }
}
