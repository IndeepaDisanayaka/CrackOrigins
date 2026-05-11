"use server";

import { getCollection, getMongoDb } from './mongodb';
import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

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
        const db = await getMongoDb();
        
        if (!uid || !ideaData.title || !ideaData.description) {
            return { success: false, error: "Missing required fields." };
        }

        const baseSlug = await generateSlug(ideaData.title);
        let slug = baseSlug;
        
        const existing = await db.collection("ideas").findOne({ slug });
        if (existing) {
            slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        const newId = new ObjectId().toHexString();
        
        await db.collection<any>("ideas").insertOne({
            _id: newId,
            title: ideaData.title,
            slug: slug,
            description: ideaData.description,
            image: ideaData.image || "https://images.unsplash.com/photo-1614728263952-84ea206f25ab?q=80&w=2070&auto=format&fit=crop",
            author: ideaData.author,
            authorUid: uid,
            authorPhoto: ideaData.authorPhoto || '',
            time: new Date(),
            status: { views: 0, likes: 0 },
            lastUpdated: new Date()
        });

        return { success: true, id: newId, slug: slug };
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
        const db = await getMongoDb();
        const ideaDoc = await db.collection<any>("ideas").findOne({ _id: ideaId });

        if (!ideaDoc) {
            return { success: false, error: "Idea not found." };
        }

        const isAuthor = ideaDoc.authorUid === editorData.uid;

        if (isAuthor) {
            // Delete existing creator sections
            await db.collection("creator").deleteMany({ ideaId });

            // Insert new sections
            if (sections.length > 0) {
                const docsToInsert = sections.map((section, index) => ({
                    _id: section.id || new ObjectId().toHexString(),
                    ideaId,
                    subtitle: section.title || '',
                    paragraph: section.paragraphs.map((p: any) => ({
                        text: p.text || '',
                        Typography: p.Typography || []
                    })),
                    orderid: index + 1,
                    isApproved: true,
                    time: new Date(),
                }));
                await db.collection("creator").insertMany(docsToInsert);
            }

            // Update main document
            await db.collection<any>("ideas").updateOne({ _id: ideaId }, {
                $set: {
                    sections: sections.map((s, index) => ({ ...s, order: index })),
                    lastUpdated: new Date()
                }
            });
        } else {
            // Delete existing collaboration sections by this editor
            await db.collection("idea_collaborations").deleteMany({ ideaId, authorId: editorData.uid });

            // Add new sections
            if (sections.length > 0) {
                const docsToInsert = sections.map((section, index) => ({
                    _id: section.id || new ObjectId().toHexString(),
                    ideaId,
                    authorId: editorData.uid,
                    subtitle: section.title || '',
                    paragraph: section.paragraphs || [],
                    orderid: index + 1,
                    isApproved: false,
                    time: new Date(),
                }));
                await db.collection("idea_collaborations").insertMany(docsToInsert);
            }
        }

        try {
            const { revalidatePath, revalidateTag } = await import('next/cache');
            revalidatePath('/ideas');
            revalidatePath(`/ideas/${ideaId}`);
            revalidateTag('ideas-list', 'max');
            revalidateTag(`idea-sections-${ideaId}`, 'max');
        } catch (e) {
            console.error("Revalidation error:", e);
        }

        return { success: true, approved: isAuthor };
    } catch (error: any) {
        console.error("Error saving content:", error);
        return { success: false, error: error.message };
    }
}

export const getIdeas = cache(
    unstable_cache(
        async () => {
            try {
                const db = await getMongoDb();
                const ideas = await db.collection("ideas").find().sort({ time: -1 }).toArray();
                return { success: true, ideas: JSON.parse(JSON.stringify(ideas)) };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        ['ideas-list'],
        { revalidate: 60, tags: ['ideas'] }
    )
);

export const getIdeaById = cache(
    async (ideaId: string) => {
        return unstable_cache(
            async () => {
                try {
                    const db = await getMongoDb();
                    const idea = await db.collection<any>("ideas").findOne({ _id: ideaId });
                    if (!idea) return { success: false, error: "Not found" };
                    return { success: true, idea: JSON.parse(JSON.stringify(idea)) };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            },
            [`idea-${ideaId}`],
            { revalidate: 60, tags: [`idea-${ideaId}`] }
        )();
    }
);

export const getIdeaSections = cache(
    async (ideaId: string) => {
        return unstable_cache(
            async () => {
                try {
                    const db = await getMongoDb();
                    const snapshot = await db.collection("creator")
                        .find({ ideaId })
                        .sort({ orderid: 1 })
                        .toArray();
                    
                    const sections = snapshot.map(doc => ({
                        id: doc._id,
                        title: doc.subtitle || '',
                        paragraphs: doc.paragraph || []
                    }));
                    
                    return { success: true, sections };
                } catch (error: any) {
                    console.error("Error fetching sections:", error);
                    return { success: false, error: error.message };
                }
            },
            [`idea-sections-${ideaId}`],
            { revalidate: 60, tags: [`idea-sections-${ideaId}`] }
        )();
    }
);
