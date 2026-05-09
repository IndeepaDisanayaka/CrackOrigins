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

export async function saveCollaborationContent(
    ideaId: string, 
    editorData: {
        uid: string;
        name: string;
        photo?: string;
    },
    sections: any[]
) {
    try {
        const adminDb = await getAdminDb();
        const ideaRef = adminDb.collection("ideas").doc(ideaId);
        const ideaDoc = await ideaRef.get();

        if (!ideaDoc.exists) {
            return { success: false, error: "Idea not found." };
        }

        const ideaData = ideaDoc.data();
        const isAuthor = ideaData?.authorUid === editorData.uid;

        const batch = adminDb.batch();
        
        if (isAuthor) {
            // Creator exclusive sub-collection
            const creatorCollectionRef = ideaRef.collection("creator");
            
            // Clear existing creator sections
            const existingCreatorDocs = await creatorCollectionRef.get();
            existingCreatorDocs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Save new sections to creator collection
            sections.forEach((section, index) => {
                const creatorDocRef = creatorCollectionRef.doc();
                batch.set(creatorDocRef, {
                    id: section.id || creatorDocRef.id,
                    subtitle: section.title || '',
                    paragraph: section.paragraphs || [],
                    orderid: index + 1,
                    isApproved: true,
                    time: Timestamp.now(),
                });
            });

            // Also update the main document's sections for the Reader view
            batch.update(ideaRef, {
                sections: sections.map((s, index) => ({
                    ...s,
                    order: index
                })),
                lastUpdated: Timestamp.now()
            });
        } else {
            // Guest/Collaborator sub-collection
            const collabCollectionRef = ideaRef.collection("collaborations");

            // Clear existing collaboration sections by this editor
            const existingDocs = await collabCollectionRef.where("authorId", "==", editorData.uid).get();
            existingDocs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Add new sections
            sections.forEach((section, index) => {
                const collabDocRef = collabCollectionRef.doc();
                batch.set(collabDocRef, {
                    authorId: editorData.uid,
                    id: section.id || collabDocRef.id,
                    subtitle: section.title || '',
                    paragraph: section.paragraphs || [],
                    orderid: index + 1,
                    isApproved: false,
                    time: Timestamp.now(),
                });
            });
        }

        await batch.commit();

        return { success: true, approved: isAuthor };
    } catch (error: any) {
        console.error("Error saving content:", error);
        return { success: false, error: error.message };
    }
}
