"use server";

import { getAdminDb, getAdminRtdb, ensureFirebaseAdminInitialized } from '../firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { encrypt, decrypt } from '../crypto';
import { getBlogPosts } from '../blog';
import { toIsoDate } from './helpers';
import * as Types from './types';

export async function listGame(adminUid: string, gameData: any) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canWrite = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'games', 'WRITE'));

        if (!userDoc.exists || !canWrite) {
            return { success: false, error: "Unauthorized." };
        }

        const gameRef = adminDb.collection("games").doc(); // Use auto-generated ID
        
        // Remove redundant keys from the data object - stop saving slug as requested
        const { gameId, image, ...cleanedData } = gameData;
        
        await gameRef.set({
            ...cleanedData,
            time: Timestamp.now(),
        });

        return { success: true, id: gameRef.id };
    } catch (error: any) {
        console.error("Error listing game:", error);
        return { success: false, error: error.message };
    }
}

export async function getGames() {
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("games").get();
        const games = await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const generatedSlug = await generateGameSlug(data.title || "");

            return {
                id: doc.id,
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
                images: data.images || [],
                showVideo: data.showVideo ?? true
            };
        }));
        return { success: true, games };
    } catch (error: any) {
        console.error("Error fetching games:", error);
        return { success: false, error: error.message };
    }
}

export async function generateGameSlug(title: string) {
    if (!title) return "";
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export async function getGameBySlug(slug: string) {
    console.log(`[getGameBySlug] Fetching game with slug: "${slug}"`);
    try {
        const adminDb = await getAdminDb();
        const snapshot = await adminDb.collection("games").get();
        console.log(`[getGameBySlug] Found ${snapshot.size} games in collection.`);
        
        const decodedSlug = decodeURIComponent(slug);
        const inputSlugNormalized = await generateGameSlug(decodedSlug);
        
        let targetDoc = null;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const generated = await generateGameSlug(data.title || "");
            
            if (generated === inputSlugNormalized) {
                targetDoc = doc;
                break;
            }
        }

        if (!targetDoc) return { success: false, error: "Game not found." };
        
        const data = targetDoc.data();
        const game = {
            id: targetDoc.id,
            ...data,
            slug: slug,
            requirements: {
                min: data.requirement?.min || {},
                max: data.requirement?.max || {}
            },
            time: toIsoDate(data.time) || new Date().toISOString(),
            downloadCount: data.downloadCount || 0
        };

        // Fetch updates
        const updatesSnap = await targetDoc.ref.collection("updates").orderBy("date", "desc").get();
        const updates = await Promise.all(updatesSnap.docs.map(async (u) => {
            const uData = u.data();
            const uSlug = await generateGameSlug(uData.title || "");
            return {
                id: u.id,
                ...uData,
                slug: uSlug,
                date: toIsoDate(uData.date) || new Date().toISOString(),
                createdAt: toIsoDate(uData.createdAt) || new Date().toISOString()
            };
        }));

        // Fetch reviews
        const reviewsSnap = await targetDoc.ref.collection("reviews").orderBy("time", "desc").get();
        const reviews = reviewsSnap.docs.map(r => ({ 
            id: r.id, 
            ...r.data(),
            time: toIsoDate(r.data().time) || new Date().toISOString()
        }));

        return { success: true, game, updates, reviews };
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
        const adminDb = await getAdminDb();
        const gameRef = adminDb.collection("games").doc(gameId);
        const { userId, ...rest } = reviewData;
        
        await gameRef.collection("reviews").doc(userId).set({
            ...rest,
            time: Timestamp.now()
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error adding review:", error);
        return { success: false, error: error.message };
    }
}

export async function getGameUpdate(gameSlug: string, updateId: string) {
    try {
        const adminDb = await getAdminDb();
        
        // Find game by slug
        const gamesSnap = await adminDb.collection("games").get();
        let targetGameDoc = null;
        for (const doc of gamesSnap.docs) {
            const data = doc.data();
            const generated = await generateGameSlug(data.title || "");
            if (generated === gameSlug) {
                targetGameDoc = doc;
                break;
            }
        }

        if (!targetGameDoc) return { success: false, error: "Game not found." };

        // Fetch specific update by checking all update slugs
        const allUpdatesSnap = await targetGameDoc.ref.collection("updates").get();
        let targetUpdateDoc = null;
        for (const uDoc of allUpdatesSnap.docs) {
            const uData = uDoc.data();
            const uGenerated = await generateGameSlug(uData.title || "");
            if (uGenerated === updateId) { // updateId is now the slug
                targetUpdateDoc = uDoc;
                break;
            }
        }

        if (!targetUpdateDoc) return { success: false, error: "Update not found." };

        const updateData = targetUpdateDoc.data();
        const update = {
            id: targetUpdateDoc.id,
            ...updateData,
            date: toIsoDate(updateData?.date) || new Date().toISOString(),
            createdAt: toIsoDate(updateData?.createdAt) || new Date().toISOString(),
            gameTitle: targetGameDoc.data().title
        };

        return { success: true, update };
    } catch (error: any) {
        console.error("Error fetching game update:", error);
        return { success: false, error: error.message };
    }
}

export async function incrementDownloadCount(gameId: string, userId?: string) {
    try {
        const adminDb = await getAdminDb();
        const gameRef = adminDb.collection("games").doc(gameId);
        const { Timestamp } = await import('firebase-admin/firestore');
        
        // If we have a user ID, we can prevent duplicate counts for that user
        if (userId) {
            const downloadId = `${userId.replace(/[^a-zA-Z0-9]/g, '_')}_${gameId}`;
            const downloadRef = adminDb.collection("downloads").doc(downloadId);
            const downloadDoc = await downloadRef.get();
            
            if (downloadDoc.exists) {
                // Already counted for this user
                return { success: true, alreadyCounted: true };
            }
            
            // Mark as downloaded for this user (but don't store IP)
            await downloadRef.set({
                userId,
                gameId,
                timestamp: Timestamp.now()
            });
        } else {
            // For anonymous users, we don't store IP or track duplicates to preserve privacy.
            // We create a log entry with a random ID to record the event.
            const anonDownloadRef = adminDb.collection("downloads").doc();
            await anonDownloadRef.set({
                userId: null,
                gameId,
                timestamp: Timestamp.now()
            });
        }

        const { FieldValue } = await import('firebase-admin/firestore');
        await gameRef.update({
            downloadCount: FieldValue.increment(1)
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing download count:", error);
        return { success: false, error: error.message };
    }
}

export async function updateGame(adminUid: string, gameId: string, gameData: any) {
    try {
        const adminDb = await getAdminDb();
        const userDoc = await adminDb.collection("accounts").doc(adminUid).get();
        const userData = userDoc.data();
        const canUpdate = userData?.isOwner || (userData?.ruleId && await hasPermission(adminUid, 'games', 'UPDATE'));

        if (!userDoc.exists || !canUpdate) {
            return { success: false, error: "Unauthorized." };
        }

        const gameRef = adminDb.collection("games").doc(gameId);
        const { gameId: _, image, slug, ...cleanedData } = gameData;
        
        await gameRef.update({
            ...cleanedData,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error updating game:", error);
        return { success: false, error: error.message };
    }
}

