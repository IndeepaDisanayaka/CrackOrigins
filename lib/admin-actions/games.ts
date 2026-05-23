"use server";

import { getMongoDb } from '../mongodb';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate, generateGameSlug } from './helpers';
import * as Types from './types';
import { hasPermission } from './rules';
import { ObjectId } from 'mongodb';

export async function listGame(adminUid: string, gameData: any) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canWrite = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'games', 'WRITE'));

        if (!userDoc || !canWrite) {
            return { success: false, error: "Unauthorized." };
        }

        const { gameId, image, ...cleanedData } = gameData;
        
        const res = await db.collection("games").insertOne({
            ...cleanedData,
            time: new Date(),
        });

        return { success: true, id: res.insertedId.toString() };
    } catch (error: any) {
        console.error("Error listing game:", error);
        return { success: false, error: error.message };
    }
}

export async function getGames() {
    try {
        const db = await getMongoDb();
        const docs = await db.collection("games").find().sort({ time: -1 }).toArray();
        const games = await Promise.all(docs.map(async (data: any) => {
            const generatedSlug = await generateGameSlug(data.title || "");

            return {
                id: data._id.toString(),
                slug: generatedSlug,
                title: data.title || "Untitled Game",
                genre: Array.isArray(data.genre) ? data.genre.join(" & ") : (data.genre || "Action"),
                description: data.description || "No description available.",
                image: data.image || data.logo || "/placeholder-game.png",
                logo: data.logo || "",
                video: data.video || "https://www.youtube.com/embed/AiA6gZN_usg",
                price: typeof data.price === 'number' ? (data.price === 0 ? "Free" : `$${data.price.toFixed(2)}`) : (data.price || "Free"),
                requirements: {
                    min: data.requirement?.min || "Minimum requirements not specified.",
                    max: data.requirement?.max || "Recommended requirements not specified."
                },
                os: Array.isArray(data.os) ? data.os.join(", ") : (data.os || "Windows"),
                storage: data.storage || (data.requirement?.min?.storage || "Not specified"),
                vrSupported: data.vrSupported ?? (data.requirement?.min?.vrSupported ?? false),
                itchUploadId: data.itchUploadId || "",
                itchGameId: data.itchGameId || "",
                platform: data.platform || "itch",
                redirectUrl: data.redirectUrl || "",
                images: data.images || [],
                showVideo: data.showVideo ?? true,
                listed: toIsoDate(data.createdAt) || toIsoDate(data.listed) || new Date().toISOString(),
            };
        }));
        return { success: true, games };
    } catch (error: any) {
        console.error("Error fetching games:", error);
        return { success: false, error: error.message };
    }
}


export async function getGameBySlug(slug: string) {
    try {
        const db = await getMongoDb();
        const docs = await db.collection("games").find().toArray();
        
        const decodedSlug = decodeURIComponent(slug);
        const inputSlugNormalized = await generateGameSlug(decodedSlug);
        
        let targetDoc = null;
        for (const data of docs) {
            const generated = await generateGameSlug(data.title || "");
            if (generated === inputSlugNormalized) {
                targetDoc = data;
                break;
            }
        }

        if (!targetDoc) return { success: false, error: "Game not found." };
        
        const { _id, ...docData } = targetDoc;

        const game = {
            id: _id.toString(),
            ...docData,
            slug: slug,
            requirements: {
                min: targetDoc.requirement?.min || {},
                max: targetDoc.requirement?.max || {}
            },
            time: toIsoDate(targetDoc.time) || new Date().toISOString(),
            downloadCount: targetDoc.downloadCount || 0
        };

        // Fetch updates (use top-level collection due to migration)
        const updates = await db.collection("game_updates").find({ 
            gameId: targetDoc._id.toString() 
        }).sort({ date: -1 }).toArray();
        
        const formattedUpdates = await Promise.all(updates.map(async (uData: any) => {
            const uSlug = await generateGameSlug(uData.title || "");
            return {
                id: uData._id.toString(),
                ...uData,
                slug: uSlug,
                date: toIsoDate(uData.date) || new Date().toISOString(),
                createdAt: toIsoDate(uData.createdAt) || new Date().toISOString()
            };
        }));

        // Fetch reviews
        const reviews = await db.collection("game_reviews").find({ 
            gameId: targetDoc._id.toString() 
        }).sort({ time: -1 }).toArray();
        
        const formattedReviews = reviews.map((rData: any) => ({ 
            id: rData._id.toString(), 
            ...rData,
            time: toIsoDate(rData.time) || new Date().toISOString()
        }));

        return { success: true, game, updates: formattedUpdates, reviews: formattedReviews };
    } catch (error: any) {
        console.error("Error fetching game by slug:", error);
        return { success: false, error: error.message };
    }
}

export async function addGameReview(gameId: string, reviewData: {
    userId: string,
    userName?: string,
    userPhoto?: string,
    rating: string,
    message: string
}) {
    try {
        const db = await getMongoDb();
        const { userId, ...rest } = reviewData;
        
        await db.collection("game_reviews").updateOne(
            { gameId, userId },
            { 
                $set: {
                    ...rest,
                    time: new Date()
                }
            },
            { upsert: true }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error adding review:", error);
        return { success: false, error: error.message };
    }
}

export async function getGameUpdate(gameSlug: string, updateId: string) {
    try {
        const db = await getMongoDb();
        
        const games = await db.collection("games").find().toArray();
        let targetGame = null;
        for (const data of games) {
            const generated = await generateGameSlug(data.title || "");
            if (generated === gameSlug) {
                targetGame = data;
                break;
            }
        }

        if (!targetGame) return { success: false, error: "Game not found." };

        const updates = await db.collection("game_updates").find({ 
            gameId: targetGame._id.toString() 
        }).toArray();
        
        let targetUpdate = null;
        for (const uData of updates) {
            const uGenerated = await generateGameSlug(uData.title || "");
            if (uGenerated === updateId) {
                targetUpdate = uData;
                break;
            }
        }

        if (!targetUpdate) return { success: false, error: "Update not found." };

        const update = {
            id: targetUpdate._id.toString(),
            ...targetUpdate,
            date: toIsoDate(targetUpdate?.date) || new Date().toISOString(),
            createdAt: toIsoDate(targetUpdate?.createdAt) || new Date().toISOString(),
            gameTitle: targetGame.title
        };

        return { success: true, update };
    } catch (error: any) {
        console.error("Error fetching game update:", error);
        return { success: false, error: error.message };
    }
}

export async function incrementDownloadCount(gameId: string, userId?: string) {
    try {
        const db = await getMongoDb();
        
        if (userId) {
            const downloadId = `${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${gameId}`;
            const existing = await db.collection("downloads").findOne({ _id: downloadId as any });
            
            if (existing) {
                return { success: true, alreadyCounted: true };
            }
            
            await db.collection("downloads").insertOne({
                _id: downloadId as any,
                userId,
                gameId,
                timestamp: new Date()
            });
        } else {
            await db.collection("downloads").insertOne({
                userId: null,
                gameId,
                timestamp: new Date()
            });
        }

        let objId: any = gameId;
        try { objId = new ObjectId(gameId); } catch {}
        
        await db.collection("games").updateOne(
            { _id: objId },
            { $inc: { downloadCount: 1 } }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing download count:", error);
        return { success: false, error: error.message };
    }
}

export async function updateGame(adminUid: string, gameId: string, gameData: any) {
    try {
        const db = await getMongoDb();
        const userDoc = await db.collection("accounts").findOne({ uid: adminUid });
        const canUpdate = userDoc?.isOwner || (userDoc?.ruleId && await hasPermission(adminUid, 'games', 'UPDATE'));

        if (!userDoc || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        let objId: any = gameId;
        try { objId = new ObjectId(gameId); } catch {}

        const { gameId: _, image, slug, ...cleanedData } = gameData;
        
        await db.collection("games").updateOne(
            { _id: objId },
            { $set: cleanedData }
        );

        return { success: true };
    } catch (error: any) {
        console.error("Error updating game:", error);
        return { success: false, error: error.message };
    }
}

