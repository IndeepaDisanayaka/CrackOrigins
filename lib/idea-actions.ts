"use server";

import { getAdminDb } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function generateSlug(title: string) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function publishIdea(uid: string, ideaData: {
    title: string;
    description: string;
    image?: string;
    author: string;
    authorPhoto?: string;
}) {
    try {
        const adminDb = await getAdminDb();
        
        // Basic validation
        if (!uid || !ideaData.title || !ideaData.description) {
            return { success: false, error: "Missing required fields." };
        }

        const baseSlug = await generateSlug(ideaData.title);
        let slug = baseSlug;
        
        // Check for slug uniqueness
        const existing = await adminDb.collection("ideas").where("slug", "==", slug).limit(1).get();
        if (!existing.empty) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        const ideaRef = adminDb.collection("ideas").doc();
        
        await ideaRef.set({
            title: ideaData.title,
            slug: slug,
            description: ideaData.description,
            image: ideaData.image || "https://images.unsplash.com/photo-1614728263952-84ea206f25ab?q=80&w=2070&auto=format&fit=crop",
            author: ideaData.author,
            authorUid: uid,
            authorPhoto: ideaData.authorPhoto || '',
            time: Timestamp.now(),
        });

        return { success: true, id: ideaRef.id, slug: slug };
    } catch (error: any) {
        console.error("Error publishing idea:", error);
        return { success: false, error: error.message };
    }
}
