"use server";

import { getCollection, getMongoDb } from './mongodb';
import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import diff from 'fast-diff';

export async function generateSlug(title: string) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Calculates diff between two versions of a paragraph
 */
export async function calculateParagraphDiff(oldP: any, newP: any) {
    const oldText = String(oldP?.text || "");
    const newText = String(newP?.text || "");

    if (oldText === newText) {
        return {
            delete: { from: 0, to: 0, text: "" },
            insert: { at: 0, text: "" }
        };
    }

    const changes = diff(oldText, newText);
    
    let deleteText = "";
    let insertText = "";
    let from = -1;
    let at = -1;
    
    let currentOldPos = 0;
    let currentNewPos = 0;
    
    for (const [type, text] of changes) {
        if (type === -1) { // Delete
            if (from === -1) from = currentOldPos;
            deleteText += text;
            currentOldPos += text.length;
        } else if (type === 1) { // Insert
            if (at === -1) at = currentNewPos;
            insertText += text;
            currentNewPos += text.length;
        } else { // Equal
            currentOldPos += text.length;
            currentNewPos += text.length;
        }
    }

    return {
        delete: { 
            from: from === -1 ? 0 : from, 
            to: (from === -1 ? 0 : from) + deleteText.length, 
            text: deleteText,
            Typography: (oldP?.Typography || []).filter((t: any) => 
                (t.from >= from && t.to <= from + deleteText.length)
            )
        },
        insert: { 
            at: at === -1 ? 0 : at, 
            text: insertText,
            Typography: (newP?.Typography || []).filter((t: any) =>
                (t.from >= at && t.to <= at + insertText.length)
            )
        }
    };
}

/**
 * Applies a diff to a base paragraph
 */
export async function applyParagraphDiff(oldP: any, diff: any) {
    // case: No diff, but we might have old specific structure
    if (!diff || (!diff.delete && !diff.insert)) {
        if (diff && typeof diff.text === 'string') return diff;
        return oldP || { text: "", Typography: [] };
    }
    
    let text = oldP?.text || "";
    const del = diff.delete || { from: 0, to: 0 };
    const ins = diff.insert || { at: 0, text: "" };

    // Apply delete
    const afterDelete = text.substring(0, Math.min(del.from, text.length)) + text.substring(Math.min(del.to, text.length));
    // Apply insert
    const final = afterDelete.substring(0, Math.min(ins.at, afterDelete.length)) + ins.text + afterDelete.substring(Math.min(ins.at, afterDelete.length));
    
    return {
        text: final,
        Typography: ins.Typography || oldP?.Typography || []
    };
}

export async function publishIdea(uid: string, ideaData: {
    title: string;
    description: string;
    image?: string;
    author: string;
    isPrivate: boolean;
    authorPhoto?: string;
    licenseCode?: string;
    tags?: string[];
    characters?: { name: string, type: string }[];
    environmentType?: string;
    storyType?: string;
    targetAudience?: string;
    goal?: string;
    endingType?: string;
    soundtracks?: string[];
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
            isPrivate: ideaData.isPrivate,
            authorPhoto: ideaData.authorPhoto || '',
            licenseCode: ideaData.licenseCode || '',
            tags: ideaData.tags || [],
            characters: ideaData.characters || [],
            environmentType: ideaData.environmentType || 'Modern',
            storyType: ideaData.storyType || 'Action',
            targetAudience: ideaData.targetAudience || '',
            goal: ideaData.goal || '',
            endingType: ideaData.endingType || 'Happy',
            soundtracks: ideaData.soundtracks || [],
            time: new Date(),
            status: { views: 0, likes: 0, upvotes: 0, downvotes: 0 },
            lastUpdated: new Date()
        });

        // Initialize empty snapshot
        await db.collection("idea_snapshots").insertOne({
            ideaId: newId,
            title: ideaData.title,
            sections: [],
            updated_time: new Date()
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
    sections: any[],
    isFullEditor?: boolean
) {

    try {
        const db = await getMongoDb();
        const ideaDoc = await db.collection<any>("ideas").findOne({ _id: ideaId });

        if (!ideaDoc) {
            return { success: false, error: "Idea not found." };
        }

        const isAuthor = ideaDoc.authorUid === editorData.uid;
        
        // Find current max orderId across both approved source collections
        const [authorMax, collabMax] = await Promise.all([
            db.collection("idea_authors").find({ ideaId }).sort({ orderid: -1 }).limit(1).next(),
            db.collection("idea_collaborations").find({ ideaId, isApproved: true }).sort({ orderid: -1 }).limit(1).next()
        ]);
        
        let maxOrder = Math.max(authorMax?.orderid || 0, collabMax?.orderid || 0);

        // Get current snapshot for diff calculation
        const currentSnapshot: any = await db.collection("idea_snapshots").findOne({ ideaId });
        const snapshotSections = currentSnapshot?.sections || [];

        // Process sections and form the version chain
        if (sections.length > 0) {
            const docsToInsert = await Promise.all(sections.map(async (section, index) => {
                // Find latest approved version to track ordering and lineage
                const [creatorLatest, collabLatest] = await Promise.all([
                    db.collection("idea_authors").findOne(
                        { ideaId, sectionId: section.id, isApproved: true },
                        { sort: { updated_time: -1, time: -1 } }
                    ),
                    db.collection("idea_collaborations").findOne(
                        { ideaId, sectionId: section.id, isApproved: true },
                        { sort: { updated_time: -1, time: -1 } }
                    )
                ]);

                const getDocTime = (doc: any) => {
                    if (!doc) return 0;
                    const t = doc.updated_time || doc.time || 0;
                    return t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : 0);
                };

                let lastApproved = null;
                if (creatorLatest && collabLatest) {
                    lastApproved = getDocTime(creatorLatest) >= getDocTime(collabLatest) ? creatorLatest : collabLatest;
                } else {
                    lastApproved = creatorLatest || collabLatest;
                }

                let orderid = 0;
                if (lastApproved) {
                    orderid = lastApproved.orderid;
                } else {
                    maxOrder += 1;
                    orderid = maxOrder;
                }

                // Find snapshot data for diffing - try both string and ObjectId if needed, but here we assume string
                const snapshotSection = snapshotSections.find((s: any) => String(s.id) === String(section.id));

                return {
                    _id: new ObjectId(),
                    ideaId,
                    sectionId: section.id,
                    authorId: editorData.uid,
                    subtitle: section.title || section.subtitle || '',
                    slug: (section.title || section.subtitle || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'),
                    paragraph: await (async () => {
                        const oldPs = snapshotSection?.paragraphs || [];
                        const newPs = section.paragraphs || [];
                        const maxLen = Math.max(oldPs.length, newPs.length);
                        const pDiffs = [];
                        for (let i = 0; i < maxLen; i++) {
                            pDiffs.push(await calculateParagraphDiff(oldPs[i], newPs[i]));
                        }
                        return pDiffs;
                    })(),
                    orderid: orderid,
                    isApproved: isAuthor, 
                    parentId: lastApproved ? lastApproved._id : null,
                    time: new Date(),
                    updated_time: new Date()
                };
            }));


            const collectionName = isAuthor ? "idea_authors" : "idea_collaborations";
            await db.collection(collectionName).insertMany(docsToInsert as any[]);
        }

        if (isAuthor && sections.length > 0) {
            // Update the main ideas document
            await db.collection<any>("ideas").updateOne({ _id: ideaId }, {
                $set: { lastUpdated: new Date() }
            });

            // Update ONLY the affected sections in the snapshot
            for (const section of sections) {
                const snapshotSectionData = {
                    id: section.id,
                    title: section.title || section.subtitle || '',
                    slug: (section.title || section.subtitle || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-'),
                    paragraphs: section.paragraphs.map((p: any) => ({
                        text: typeof p === 'string' ? p : (p.text || ''),
                        Typography: p.Typography || []
                    })),
                    orderid: sections.find(s => s.id === section.id)?.orderid || maxOrder,
                    updated_time: new Date()
                };

                // Ensure we use string comparison for ideaId
                const snapshotQuery = { ideaId: String(ideaId), "sections.id": String(section.id) };
                
                // Try to update existing section in the array
                const updateRes = await db.collection<any>("idea_snapshots").updateOne(
                    snapshotQuery,
                    { 
                        $set: { 
                            "sections.$": snapshotSectionData,
                            updated_time: new Date()
                        } 
                    } as any
                );

                // If not found in array or document missing partially, use an upsert-like push
                if (updateRes.matchedCount === 0) {
                    await db.collection<any>("idea_snapshots").updateOne(
                        { ideaId: String(ideaId) },
                        { 
                            $push: { sections: snapshotSectionData },
                            $set: { updated_time: new Date() }
                        } as any,
                        { upsert: true }
                    );
                }
            }
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
        async (limit = 10, skip = 0) => {
            try {
                const db = await getMongoDb();
                const ideas = await db.collection("ideas")
                    .find({ isPrivate: false })
                    .sort({ time: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                const total = await db.collection("ideas").countDocuments({ isPrivate: false });
                return { success: true, ideas: JSON.parse(JSON.stringify(ideas)), total };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        ['ideas-list'],
        { revalidate: 60, tags: ['ideas'] }
    )
);

export async function getIdeaStats() {
    try {
        const db = await getMongoDb();
        const now = new Date();
        const startOfToday = new Date(now.setHours(0,0,0,0));
        
        const [todayPubs, allPubs, allCollabs] = await Promise.all([
            db.collection("ideas").countDocuments({ time: { $gte: startOfToday } }),
            db.collection("ideas").countDocuments({ isPrivate: false }),
            db.collection("idea_collaborations").countDocuments({ isApproved: true })
        ]);

        return {
            success: true,
            stats: {
                todayPublications: todayPubs,
                allPublications: allPubs,
                allCollaborations: allCollabs
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

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

/**
 * Fetch the latest snapshot for an idea (Consolidated content)
 */
export async function getIdeaSnapshot(ideaId: string) {
    try {
        const db = await getMongoDb();
        const snapshot = await db.collection("idea_snapshots").findOne({ ideaId });
        
        // සිංහල: Snapshot එකේ දත්ත නොමැති නම් Author ගේ දත්ත වලින් load කිරීමට fallback එකක් එක් කරන ලදී.
        if (!snapshot || !snapshot.sections || snapshot.sections.length === 0) {
            const sectionsRes = await getIdeaSections(ideaId);
            if (sectionsRes.success) {
                return { 
                    success: true, 
                    snapshot: { sections: sectionsRes.sections },
                    isFallback: true 
                };
            }
        }

        if (!snapshot) return { success: false, error: "Snapshot and fallback failed" };
        return { success: true, snapshot: JSON.parse(JSON.stringify(snapshot)) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const getIdeaSections = cache(
    async (ideaId: string, userId?: string) => {
        try {
            const db = await getMongoDb();

            // Build the query to find:
            // 1. ALL Approved content (author or collaborations)
            // 2. The Current User's own (potentially unapproved) content so they don't lose their work
            // 0. Get the latest snapshot if available
            const snapshotDoc: any = await db.collection("idea_snapshots").findOne({ ideaId });

            // Build the query to find:
            // 1. ALL Approved content (author or collaborations)
            // 2. The Current User's own (potentially unapproved) content so they don't lose their work
            const sections = await db.collection("idea_authors").aggregate([
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
                        latestDoc: { $first: "$$ROOT" },
                        allAuthorIds: { $push: "$authorId" },
                        allParentIds: { $push: "$parentId" }
                    }
                },
                { $sort: { "latestDoc.orderid": 1 } }
            ]).toArray();

            // Resolve full contributor chain for each section
            const mappedSections = await Promise.all(sections.map(async (doc: any) => {
                const latest = doc.latestDoc;
                
                // Collect unique author IDs from history
                const uniqueAuthors = new Set<string>();
                
                // Start with the latest author
                if (latest.authorId) uniqueAuthors.add(latest.authorId);

                // Recursively fetch parents
                let currentParentId = latest.parentId;
                while (currentParentId) {
                    const parentDoc: any = await db.collection("idea_collaborations").findOne({ _id: currentParentId }) || 
                                          await db.collection("idea_authors").findOne({ _id: currentParentId });
                    
                    if (parentDoc) {
                        if (parentDoc.authorId) uniqueAuthors.add(parentDoc.authorId);
                        currentParentId = parentDoc.parentId;
                    } else {
                        break;
                    }
                }

                const getDocTime = (doc: any) => {
                    if (!doc) return 0;
                    const t = doc.updated_time || doc.time || 0;
                    return t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : 0);
                };

                // Logic to determine display content:
                // 1. If snapshot is newer than or equal to the latest doc, use snapshot (it's consolidated)
                // 2. If snapshot exists but doc is newer, apply diff to snapshot
                // 3. Fallback to latest.paragraph if no snapshot
                
                let displayParagraphs = latest.paragraph || [];
                const snapshotSection = snapshotDoc?.sections?.find((s: any) => s.id === doc._id);
                const snapshotTime = snapshotDoc?.updated_time ? new Date(snapshotDoc.updated_time).getTime() : 0;
                const latestTime = getDocTime(latest);
                
                if (snapshotSection && snapshotTime >= latestTime) {
                    displayParagraphs = snapshotSection.paragraphs || [];
                } else if (snapshotSection) {
                    // Apply the latest diff to the snapshot context
                    displayParagraphs = await Promise.all((latest.paragraph || []).map(async (diff: any, idx: number) => {
                        return await applyParagraphDiff(snapshotSection.paragraphs?.[idx], diff);
                    }));
                } else {
                    // Completely new contribution or old version fallback
                    displayParagraphs = (latest.paragraph || []).map((diff: any) => {
                        // case 1: New diff structure (insert)
                        if (diff && diff.insert) {
                             return { text: diff.insert.text || "", Typography: diff.insert.Typography || [] };
                        }
                        // case 2: Old structure (full content)
                        if (diff && typeof diff.text === 'string') {
                            return { text: diff.text, Typography: diff.Typography || [] };
                        }
                        // case 3: Raw string
                        return { text: (typeof diff === 'string' ? diff : ""), Typography: [] };
                    });
                }

                const contributors = await db.collection("accounts").find({ uid: { $in: Array.from(uniqueAuthors) } }).toArray();

                return {
                    id: doc._id,
                    title: latest.subtitle || '',
                    slug: latest.slug || '',
                    paragraphs: displayParagraphs,
                    collaborators: contributors.map((c: any) => ({
                        uid: c.uid,
                        name: c.name || c.displayName || 'Anonymous',
                        photo: c.photoURL || c.photo || '',
                        rank: c.affiliateLevel || 'starter'
                    })),
                    updated_time: latest.updated_time
                };
            }));

            return { success: true, sections: mappedSections };
        } catch (error: any) {
            console.error("Error fetching sections:", error);
            return { success: false, error: error.message };
        }
    }
);

/**
 * Helper to build authorMap from collaborations list
 */
async function buildAuthorMap(db: any, collaborations: any[]) {
    const authorIds = [...new Set(collaborations.map((c: any) => c.authorId).filter(Boolean))];
    if (authorIds.length === 0) return {};
    // Try both uid and userId fields
    const authors = await db.collection("accounts").find({
        $or: [
            { uid: { $in: authorIds } },
            { userId: { $in: authorIds } },
            { _id: { $in: authorIds } }
        ]
    }).toArray();
    const map: Record<string, { name: string; photo: string }> = {};
    for (const a of authors) {
        const key = a.uid || a.userId || a._id?.toString();
        if (key) map[key] = { name: a.name || a.displayName || 'Anonymous', photo: a.photoURL || a.photo || '' };
    }
    return map;
}

/**
 * Fetch pending collaboration requests for an idea
 */
export async function getPendingCollaborations(ideaId: string) {
    try {
        const db = await getMongoDb();
        const collaborations = await db.collection("idea_authors").aggregate([
            { $match: { ideaId, isApproved: false } },
            { $unionWith: { coll: "idea_collaborations", pipeline: [{ $match: { ideaId, isApproved: false } }] } },
            { $sort: { time: -1 } }
        ]).toArray();

        const authorMap = await buildAuthorMap(db, collaborations);

        const results = collaborations.map((c: any) => ({
            id: c._id.toString(),
            authorId: c.authorId,
            authorName: authorMap[c.authorId]?.name || c.authorName || 'Unknown',
            authorPhoto: authorMap[c.authorId]?.photo || c.authorPhoto || '',
            subtitle: c.subtitle,
            paragraph: c.paragraph,
            sectionId: c.sectionId,
            parentId: c.parentId?.toString(),
            time: c.time,
            isApproved: false
        }));

        return { success: true, collaborations: results };
    } catch (error: any) {
        console.error("Error fetching pending collaborations:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch ALL collaboration requests (pending + approved) for an idea
 */
export async function getAllCollaborations(ideaId: string) {
    try {
        const db = await getMongoDb();
        const collaborations = await db.collection("idea_authors").aggregate([
            { $match: { ideaId } },
            { $unionWith: { coll: "idea_collaborations", pipeline: [{ $match: { ideaId } }] } },
            { $sort: { time: -1 } }
        ]).toArray();

        const authorMap = await buildAuthorMap(db, collaborations);

        const results = collaborations.map((c: any) => ({
            id: c._id.toString(),
            authorId: c.authorId,
            authorName: authorMap[c.authorId]?.name || c.authorName || 'Unknown',
            authorPhoto: authorMap[c.authorId]?.photo || c.authorPhoto || '',
            subtitle: c.subtitle,
            paragraph: c.paragraph,
            sectionId: c.sectionId,
            parentId: c.parentId?.toString(),
            time: c.time,
            isApproved: c.isApproved || false
        }));

        return { success: true, collaborations: results };
    } catch (error: any) {
        console.error("Error fetching all collaborations:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch a specific collaboration or section by ID
 */
export async function getCollaborationById(id: string) {
    try {
        const db = await getMongoDb();
        const { ObjectId } = await import('mongodb');

        // Check collaborations first
        let doc = await db.collection("idea_collaborations").findOne({ _id: new ObjectId(id) });
        
        // If not found, check sections (idea_authors)
        if (!doc) {
            doc = await db.collection("idea_authors").findOne({ _id: new ObjectId(id) });
        }

        if (!doc) {
            return { success: false, error: 'Content not found' };
        }

        return {
            success: true,
            collaboration: {
                id: doc._id.toString(),
                authorId: doc.authorId,
                subtitle: doc.subtitle,
                paragraph: doc.paragraph,
                sectionId: doc.sectionId,
                parentId: doc.parentId?.toString(),
                time: doc.time,
                isApproved: doc.isApproved
            }
        };
    } catch (error: any) {
        console.error("Error fetching collaboration:", error);
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

        // Try idea_collaborations first
        let result = await db.collection("idea_collaborations").updateOne(
            { _id: new ObjectId(collaborationId) },
            {
                $set: {
                    isApproved: true,
                    updated_time: new Date()
                }
            }
        );

        // If not found, try idea_authors (though authors are usually auto-approved)
        if (result.matchedCount === 0) {
            result = await db.collection("idea_authors").updateOne(
                { _id: new ObjectId(collaborationId) },
                {
                    $set: {
                        isApproved: true,
                        updated_time: new Date()
                    }
                }
            );
        }

        if (result.modifiedCount === 0 && result.matchedCount === 0) {
            return { success: false, error: 'Collaboration not found or already approved' };
        }

        // Sync ONLY the specific section in the snapshot after approval
        const collab: any = await db.collection("idea_collaborations").findOne({ _id: new ObjectId(collaborationId) }) ||
                           await db.collection("idea_authors").findOne({ _id: new ObjectId(collaborationId) });
        
        if (collab && collab.ideaId) {
            // Reconstruct the individual section based on its diff and current snapshot state
            const snapshot: any = await db.collection("idea_snapshots").findOne({ ideaId: collab.ideaId });
            const snapshotSection = snapshot?.sections?.find((s: any) => s.id === collab.sectionId);
            
            const reconstructedParagraphs = await Promise.all((collab.paragraph || []).map(async (diff: any, idx: number) => {
                return await applyParagraphDiff(snapshotSection?.paragraphs?.[idx], diff);
            }));

            const updatedSectionData = {
                id: collab.sectionId,
                title: collab.subtitle || snapshotSection?.title || '',
                slug: collab.slug || snapshotSection?.slug || '',
                paragraphs: reconstructedParagraphs,
                orderid: collab.orderid || snapshotSection?.orderid || 0,
                updated_time: new Date()
            };

            const updateRes = await db.collection("idea_snapshots").updateOne(
                { ideaId: collab.ideaId, "sections.id": collab.sectionId },
                { 
                    $set: { 
                        "sections.$": updatedSectionData,
                        updated_time: new Date()
                    } 
                } as any
            );

            if (updateRes.matchedCount === 0) {
                await db.collection("idea_snapshots").updateOne(
                    { ideaId: collab.ideaId },
                    { 
                        $push: { sections: updatedSectionData },
                        $set: { updated_time: new Date() }
                    } as any
                );
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error approving collaboration:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Unapprove a collaboration request
 */
export async function unapproveCollaboration(collaborationId: string) {
    try {
        const db = await getMongoDb();
        const { ObjectId } = await import('mongodb');

        // Try idea_collaborations first
        let result = await db.collection("idea_collaborations").updateOne(
            { _id: new ObjectId(collaborationId) },
            {
                $set: {
                    isApproved: false,
                    updated_time: new Date()
                }
            }
        );

        // If not found, try idea_authors
        if (result.matchedCount === 0) {
            result = await db.collection("idea_authors").updateOne(
                { _id: new ObjectId(collaborationId) },
                {
                    $set: {
                        isApproved: false,
                        updated_time: new Date()
                    }
                }
            );
        }

        if (result.modifiedCount === 0 && result.matchedCount === 0) {
            return { success: false, error: 'Collaboration not found' };
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error unapproving collaboration:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a collaboration request
 */
export async function deleteCollaboration(collaborationId: string, uid: string) {
    try {
        const db = await getMongoDb();
        const { ObjectId } = await import('mongodb');

        const collabs = db.collection("idea_collaborations");
        const authors = db.collection("idea_authors");
        
        let collab: any = await collabs.findOne({ _id: new ObjectId(collaborationId) });
        let currentColl = collabs;
        
        if (!collab) {
            collab = await authors.findOne({ _id: new ObjectId(collaborationId) });
            currentColl = authors;
        }

        if (!collab) return { success: false, error: 'Collaboration not found' };

        // Authorization: Contributor or Idea Author
        const idea = await db.collection("ideas").findOne({ _id: collab.ideaId });
        const isIdeaAuthor = idea && idea.authorUid === uid;
        const isContributor = collab.authorId === uid;

        if (!isIdeaAuthor && !isContributor) {
            return { success: false, error: 'Unauthorized to delete this publication.' };
        }

        await currentColl.deleteOne({
            _id: new ObjectId(collaborationId)
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting collaboration:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCollaboration(collaborationId: string, uid: string, data: { subtitle: string, paragraph: any[] }) {
    try {
        const db = await getMongoDb();
        const { ObjectId } = await import('mongodb');

        const collabs = db.collection("idea_collaborations");
        const authors = db.collection("idea_authors");
        
        let collab: any = await collabs.findOne({ _id: new ObjectId(collaborationId) });
        let currentColl = collabs;
        
        if (!collab) {
            collab = await authors.findOne({ _id: new ObjectId(collaborationId) });
            currentColl = authors;
        }

        if (!collab) return { success: false, error: 'Collaboration not found' };

        if (collab.authorId !== uid) {
            return { success: false, error: 'Unauthorized to update this publication.' };
        }

        // Get current snapshot for diff calculation
        const currentSnapshot: any = await db.collection("idea_snapshots").findOne({ ideaId: collab.ideaId });
        const snapshotSection = currentSnapshot?.sections?.find((s: any) => String(s.id) === String(collab.sectionId));
        const snapshotParagraphs = snapshotSection?.paragraphs || [];

        await currentColl.updateOne(
            { _id: new ObjectId(collaborationId) },
            { 
                $set: { 
                    subtitle: data.subtitle, 
                    paragraph: await Promise.all(data.paragraph.map(async (p: any, idx: number) => {
                        // If p is already a diff (unlikely from frontend but possible)
                        if (p && (p.delete || p.insert) && typeof p.insert?.text !== 'string') return p;
                        
                        // Calculate diff against snapshot
                        const oldP = snapshotParagraphs[idx];
                        return await calculateParagraphDiff(oldP, p);
                    })),
                    time: Date.now() 
                } 
            }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error updating collaboration:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Idea Comments Actions
 */
export async function getIdeaComments(ideaId: string, page = 1, limit = 10) {
    try {
        const commentsCol = await getCollection('idea_comments');
        const skip = (page - 1) * limit;

        const comments = await commentsCol.find({ ideaId })
            .sort({ commenteddatetime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        return {
            success: true,
            comments: comments.map(c => ({
                id: c._id.toString(),
                userId: c.userId,
                ideaId: c.ideaId,
                comment: c.comment,
                userName: c.userName || 'Operative',
                userAvatar: c.userAvatar || null,
                role: c.role || 'user',
                likes: c.likes || 0,
                commenteddatetime: c.commenteddatetime ? new Date(c.commenteddatetime).toISOString() : null
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function upsertIdeaComment(ideaId: string, userId: string, data: any) {
    try {
        const commentsCol = await getCollection('idea_comments');
        const payload = {
            ...data,
            ideaId,
            userId,
            commenteddatetime: data.commenteddatetime || new Date(),
            lastUpdated: new Date()
        };

        await commentsCol.updateOne(
            { ideaId, userId },
            { $set: payload },
            { upsert: true }
        );

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteIdeaComment(ideaId: string, userId: string) {
    try {
        const commentsCol = await getCollection('idea_comments');
        await commentsCol.deleteOne({ ideaId, userId });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleIdeaCommentLike(ideaId: string, commentUserId: string, increment: boolean) {
    try {
        const commentsCol = await getCollection('idea_comments');
        await commentsCol.updateOne(
            { ideaId, userId: commentUserId },
            { $inc: { likes: increment ? 1 : -1 } }
        );
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUserIdeas(uid: string) {
    try {
        const db = await getMongoDb();
        const ideas = await db.collection("ideas").find({ authorUid: uid }).sort({ time: -1 }).toArray();
        return { success: true, ideas: JSON.parse(JSON.stringify(ideas)) };
    } catch (error: any) {
        console.error("Error fetching user ideas:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteIdea(ideaId: string, uid: string) {
    try {
        const db = await getMongoDb();

        // 1. Verify ownership
        const idea = await db.collection<any>("ideas").findOne({ _id: ideaId });
        if (!idea) {
            return { success: false, error: "Idea not found." };
        }
        if (idea.authorUid !== uid) {
            return { success: false, error: "Unauthorized. You are not the author of this idea." };
        }

        // 2. Delete related data (Cascade Delete)
        await Promise.all([
            db.collection("ideas").deleteOne({ _id: ideaId as any }),
            db.collection("idea_authors").deleteMany({ ideaId }),
            db.collection("idea_collaborations").deleteMany({ ideaId }),
            db.collection("idea_comments").deleteMany({ ideaId }),
            db.collection("idea_votes").deleteMany({ ideaId }),
            db.collection("account_library").deleteMany({ contentId: ideaId })
        ]);

        // 3. Revalidate paths
        try {
            const { revalidatePath } = await import('next/cache');
            revalidatePath('/ideas');
            revalidatePath('/account');
            revalidatePath(`/ideas/${ideaId}`);
        } catch (e) {
            console.error("Revalidation error:", e);
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting idea:", error);
        return { success: false, error: error.message };
    }
}

export async function updateIdeaMetadata(ideaId: string, uid: string, data: { 
    description?: string;
    image?: string; 
    isPrivate?: boolean;
    tags?: string[];
    characters?: { name: string, type: string }[];
    environmentType?: string;
    storyType?: string;
    targetAudience?: string;
    goal?: string;
    endingType?: string;
    soundtracks?: string[];
}) {
    try {
        const db = await getMongoDb();
        const idea = await db.collection<any>("ideas").findOne({ _id: ideaId });
        
        if (!idea) {
            return { success: false, error: "Idea not found." };
        }
        if (idea.authorUid !== uid) {
            return { success: false, error: "Unauthorized. Access Denied." };
        }

        const updateDoc: any = { lastUpdated: new Date() };

        if (data.description !== undefined) updateDoc.description = data.description;
        if (data.image !== undefined) updateDoc.image = data.image;
        if (data.isPrivate !== undefined) updateDoc.isPrivate = data.isPrivate;
        if (data.tags !== undefined) updateDoc.tags = data.tags;
        if (data.characters !== undefined) updateDoc.characters = data.characters;
        if (data.environmentType !== undefined) updateDoc.environmentType = data.environmentType;
        if (data.storyType !== undefined) updateDoc.storyType = data.storyType;
        if (data.goal !== undefined) updateDoc.goal = data.goal;
        if (data.endingType !== undefined) updateDoc.endingType = data.endingType;
        if (data.soundtracks !== undefined) updateDoc.soundtracks = data.soundtracks;

        await db.collection("ideas").updateOne(
            { _id: ideaId as any },
            { $set: updateDoc }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error updating meta-data:", error);
        return { success: false, error: error.message };
    }
}

export async function incrementIdeaViews(ideaId: string) {
    try {
        const db = await getMongoDb();
        await db.collection("ideas").updateOne(
            { _id: ideaId as any },
            { $inc: { "status.views": 1 } }
        );
        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing views:", error);
        return { success: false, error: error.message };
    }
}

export async function toggleLibrarySave(userId: string, ideaId: string) {
    try {
        const db = await getMongoDb();
        const collection = db.collection("account_library");
        const existing = await collection.findOne({ userId, contentId: ideaId });
        
        if (existing) {
            await collection.deleteOne({ userId, contentId: ideaId });
            return { success: true, saved: false };
        } else {
            await collection.insertOne({
                _id: new ObjectId().toHexString() as any,
                type: "idea",
                datetime: new Date(),
                userId,
                contentId: ideaId
            });
            return { success: true, saved: true };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function voteIdea(userId: string, userName: string, ideaId: string, voteType: 'up' | 'down') {
    try {
        const db = await getMongoDb();
        const votesCol = db.collection("idea_votes");
        const existingVote: any = await votesCol.findOne({ userId, ideaId });
        
        if (existingVote && existingVote.voteType === voteType) {
            await votesCol.deleteOne({ userId, ideaId });
            const field = voteType === 'up' ? "status.upvotes" : "status.downvotes";
            await db.collection("ideas").updateOne({ _id: ideaId as any }, { $inc: { [field]: -1 } });
            return { success: true, vote: null };
        } else {
            if (existingVote) {
                const oldField = existingVote.voteType === 'up' ? "status.upvotes" : "status.downvotes";
                await db.collection("ideas").updateOne({ _id: ideaId as any }, { $inc: { [oldField]: -1 } });
            }
            await votesCol.updateOne(
                { userId, ideaId },
                { $set: { userName, time: new Date(), voteType, ideaId } },
                { upsert: true }
            );
            const newField = voteType === 'up' ? "status.upvotes" : "status.downvotes";
            await db.collection("ideas").updateOne({ _id: ideaId as any }, { $inc: { [newField]: 1 } });
            return { success: true, vote: voteType };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getIdeaUserStatus(userId: string, ideaId: string) {
    try {
        const db = await getMongoDb();
        const [saved, vote] = await Promise.all([
            db.collection("account_library").findOne({ userId, contentId: ideaId }),
            db.collection("idea_votes").findOne({ userId, ideaId })
        ]);
        return { 
            success: true, 
            isSaved: !!saved, 
            userVote: vote ? (vote as any).voteType : null 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
export async function getSavedIdeas(userId: string) {
    try {
        const db = await getMongoDb();
        const saves = await db.collection("account_library").find({ userId, type: "idea" }).toArray();
        if (saves.length === 0) return { success: true, ideas: [] };
        
        const ideaIds = saves.map(s => s.contentId);
        const ideas = await db.collection("ideas").find({ _id: { $in: ideaIds as any } }).toArray();
        
        return { success: true, ideas };
    } catch (error: any) {
        console.error("Error fetching saved ideas:", error);
        return { success: false, error: error.message };
    }
}
