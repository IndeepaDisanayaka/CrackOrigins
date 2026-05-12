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

        // Process sections and form the version chain
        if (sections.length > 0) {
            const docsToInsert = await Promise.all(sections.map(async (section, index) => {
                // Find all approved versions from both collections
                const [creatorLatest, collabLatest] = await Promise.all([
                    db.collection("creator").findOne(
                        { ideaId, sectionId: section.id, isApproved: true },
                        { sort: { updated_time: -1, time: -1 } }
                    ),
                    db.collection("idea_collaborations").findOne(
                        { ideaId, sectionId: section.id, isApproved: true },
                        { sort: { updated_time: -1, time: -1 } }
                    )
                ]);

                // Determine the absolute latest approved version across both collections
                let lastApproved = null;
                if (creatorLatest && collabLatest) {
                    const creatorTime = creatorLatest.updated_time || creatorLatest.time || 0;
                    const collabTime = collabLatest.updated_time || collabLatest.time || 0;
                    lastApproved = creatorTime >= collabTime ? creatorLatest : collabLatest;
                } else {
                    lastApproved = creatorLatest || collabLatest;
                }

                return {
                    _id: new ObjectId(),
                    ideaId,
                    sectionId: section.id,
                    authorId: editorData.uid,
                    subtitle: section.title || '',
                    paragraph: section.paragraphs.map((p: any) => ({
                        text: typeof p === 'string' ? p : (p.text || ''),
                        Typography: p.Typography || []
                    })),
                    orderid: index + 1,
                    isApproved: isAuthor, // Only authors are auto-approved
                    parentId: lastApproved ? lastApproved._id : null,
                    time: new Date(),
                    updated_time: new Date()
                };
            }));

            const collectionName = isAuthor ? "creator" : "idea_collaborations";
            await db.collection(collectionName).insertMany(docsToInsert as any[]);
        }

        if (isAuthor) {
            // Update the main ideas document with the flattened latest state for quick listing
            await db.collection<any>("ideas").updateOne({ _id: ideaId }, {
                $set: {
                    sections: sections.map((s, index) => ({ ...s, order: index })),
                    lastUpdated: new Date()
                }
            });
        }

        // Trigger Next.js revalidation
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
    async (ideaId: string, userId?: string) => {
        try {
            const db = await getMongoDb();
            
            // Build the query to find:
            // 1. ALL Approved content (creator or collaborations)
            // 2. The Current User's own (potentially unapproved) content so they don't lose their work
            const sections = await db.collection("creator").aggregate([
                { $match: { ideaId, isApproved: true } },
                { 
                    $unionWith: { 
                        coll: "idea_collaborations", 
                        pipeline: [
                            { 
                                $match: { 
                                    ideaId, 
                                    $or: [
                                        { isApproved: true },
                                        { authorId: userId }
                                    ]
                                } 
                            }
                        ] 
                    } 
                },
                { $sort: { updated_time: -1, time: -1 } },
                { 
                    $group: {
                        _id: "$sectionId",
                        title: { $first: "$subtitle" },
                        paragraph: { $first: "$paragraph" },
                        orderid: { $first: "$orderid" },
                        dbId: { $first: "$_id" },
                        authorId: { $first: "$authorId" },
                        updated_time: { $first: "$updated_time" }
                    }
                },
                { 
                    $lookup: {
                        from: "accounts",
                        localField: "authorId",
                        foreignField: "uid",
                        as: "authorDetails"
                    }
                },
                { $sort: { orderid: 1 } }
            ]).toArray();
            
            const mappedSections = sections.map(doc => ({
                id: doc._id,
                title: doc.title || '',
                paragraphs: doc.paragraph || [],
                authorName: doc.authorDetails?.[0]?.name || 'Unknown',
                authorPhoto: doc.authorDetails?.[0]?.photoURL || '',
                updated_time: doc.updated_time
            }));
            
            return { success: true, sections: mappedSections };
        } catch (error: any) {
            console.error("Error fetching sections:", error);
            return { success: false, error: error.message };
        }
    }
);

/**
 * Fetch pending collaboration requests for an idea
 */
export async function getPendingCollaborations(ideaId: string) {
    try {
        const db = await getMongoDb();
        const collaborations = await db.collection("idea_collaborations")
            .find({ ideaId, isApproved: false })
            .sort({ time: -1 })
            .toArray();

        // Fetch author names for better UI
        const authorIds = [...new Set(collaborations.map(c => c.authorId))];
        const authors = await db.collection("accounts").find({ uid: { $in: authorIds } }).toArray();
        const authorMap = Object.fromEntries(authors.map(a => [a.uid, { name: a.name, photo: a.photoURL }]));

        const results = collaborations.map(c => ({
            id: c._id.toString(),
            authorId: c.authorId,
            authorName: authorMap[c.authorId]?.name || 'Unknown',
            authorPhoto: authorMap[c.authorId]?.photo || '',
            subtitle: c.subtitle,
            paragraph: c.paragraph,
            sectionId: c.sectionId,
            time: c.time
        }));

        return { success: true, collaborations: results };
    } catch (error: any) {
        console.error("Error fetching pending collaborations:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Approve a collaboration request
 */
export async function approveCollaboration(collaborationId: string) {
    try {
        const db = await getMongoDb();
        const { ObjectId } = await import('mongodb');
        
        const result = await db.collection("idea_collaborations").updateOne(
            { _id: new ObjectId(collaborationId) },
            { 
                $set: { 
                    isApproved: true, 
                    updated_time: Date.now() 
                } 
            }
        );

        if (result.modifiedCount === 0) {
            return { success: false, error: 'Collaboration not found or already approved' };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error approving collaboration:", error);
        return { success: false, error: error.message };
    }
}
