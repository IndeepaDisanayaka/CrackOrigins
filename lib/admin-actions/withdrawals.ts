"use server";

import { getMongoDb } from '../mongodb';
import { ObjectId } from 'mongodb';

export async function getWithdrawalRequests(adminUid: string) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ 
            $or: [{ uid: adminUid }, { _id: ObjectId.isValid(adminUid) ? new ObjectId(adminUid) : adminUid as any }] 
        });
        
        if (!adminDoc || (!adminDoc.isOwner && !adminDoc.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        const withdrawals = await db.collection("game_withdrawals")
            .find()
            .sort({ createdAt: -1 })
            .toArray();
        
        // Collect all unique accountIds and ensure they are strings for consistent mapping
        const rawAccountIds = withdrawals.map(w => w.accountId).filter(Boolean);
        const uniqueAccountIdStrings = [...new Set(rawAccountIds.map(id => id.toString()))];
        
        // Game IDs and Product Codes
        const uniqueGameIdStrings = [...new Set(withdrawals.map(w => w.gameId?.toString()).filter(Boolean))];
        const uniqueProductCodes = [...new Set(withdrawals.map(w => w.productCode).filter(Boolean))];

        // ─── Fetch user names ───────────────────────────────────────────────
        const validObjectIds = uniqueAccountIdStrings.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
        
        const users = await db.collection("accounts").find({ 
            $or: [
                { uid: { $in: uniqueAccountIdStrings } },
                { _id: { $in: uniqueAccountIdStrings } as any }, // Match if _id is string
                ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : [])
            ]
        }).toArray();

        const userMap: Record<string, string> = {};
        for (const u of users) {
            const name = u.name || u.displayName || u.email || "No Name";
            const idStr = u._id.toString();
            userMap[idStr] = name;
            if (u.uid) userMap[u.uid] = name;
            if (typeof u._id === 'string') userMap[u._id] = name;
        }

        // ─── Fetch game titles ──────────────────────────────────────────────
        const validGameObjectIds = uniqueGameIdStrings.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
        const gameQuery: any[] = [
            { slug: { $in: uniqueProductCodes } },
            { id: { $in: uniqueProductCodes } },
            { itchGameId: { $in: uniqueProductCodes } },
            { _id: { $in: uniqueGameIdStrings } as any }
        ];
        if (validGameObjectIds.length > 0) {
            gameQuery.push({ _id: { $in: validGameObjectIds } });
        }

        const games = await db.collection("games").find({ $or: gameQuery }).toArray();
        const gameMap: Record<string, string> = {};
        for (const g of games) {
            const title = g.title || g.name || "Unknown Game";
            const idStr = g._id.toString();
            gameMap[idStr] = title;
            if (g.slug) gameMap[g.slug] = title;
            if (g.id) gameMap[g.id] = title;
            if (g.itchGameId) gameMap[g.itchGameId] = title;
            if (typeof g._id === 'string') gameMap[g._id] = title;
        }

        const results = withdrawals.map((w: any) => {
            const accIdStr = w.accountId?.toString();
            const gIdStr = w.gameId?.toString();
            return {
                id: w._id.toString(),
                amount: w.amount,
                mobileNo: w.mobileNo,
                country: w.country,
                accountId: accIdStr,
                productCode: w.productCode,
                gameId: gIdStr,
                gameName: gameMap[gIdStr] || gameMap[w.productCode] || w.productCode || "Unknown Game",
                xpDeducted: w.xpDeducted,
                status: w.status,
                isProcessed: w.isProcessed ?? false,
                createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : null,
                updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : null,
                userName: userMap[accIdStr] || "Unknown User",
            };
        });

        return { success: true, withdrawals: results };
    } catch (error: any) {
        console.error("Error fetching withdrawals:", error);
        return { success: false, error: error.message };
    }
}

export async function processWithdrawal(adminUid: string, withdrawalId: string, status: 'COMPLETED' | 'REJECTED') {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ 
            $or: [{ uid: adminUid }, { _id: ObjectId.isValid(adminUid) ? new ObjectId(adminUid) : adminUid as any }]
        });
        
        if (!adminDoc || (!adminDoc.isOwner && !adminDoc.ruleId)) {
            return { success: false, error: "Unauthorized." };
        }

        let objId: any = withdrawalId;
        try { if (ObjectId.isValid(withdrawalId)) objId = new ObjectId(withdrawalId); } catch {}

        const result = await db.collection("game_withdrawals").updateOne(
            { _id: objId },
            { 
                $set: { 
                    status,
                    isProcessed: true, // Marker to indicate it has been processed
                    processedAt: new Date(),
                    updatedAt: new Date(),
                    processedBy: adminUid
                } 
            }
        );

        if (result.matchedCount === 0) {
            // Try matching as string if ObjectId failed
            const res2 = await db.collection("game_withdrawals").updateOne(
                { _id: withdrawalId as any },
                { 
                    $set: { 
                        status,
                        isProcessed: true,
                        processedAt: new Date(),
                        updatedAt: new Date(),
                        processedBy: adminUid
                    } 
                }
            );
            if (res2.matchedCount === 0) {
                return { success: false, error: "Withdrawal record not found." };
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error processing withdrawal:", error);
        return { success: false, error: error.message };
    }
}

export async function getUserGameActivities(adminUid: string, targetAccountId: string, limit = 100, skip = 0) {
    try {
        const db = await getMongoDb();
        const adminDoc = await db.collection("accounts").findOne({ 
            $or: [{ uid: adminUid }, { _id: ObjectId.isValid(adminUid) ? new ObjectId(adminUid) : adminUid as any }]
        });
        
        if (!adminDoc) return { success: false, error: "Unauthorized." };

        const activities = await db.collection("game_activities")
            .find({ 
                $or: [
                    { accountId: targetAccountId },
                    { uid: targetAccountId }
                ]
            })
            .sort({ timestamp: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Collect unique productCodes/gameIds to fetch game titles
        const uniqueProductCodes = [...new Set(activities.map((a: any) => a.productCode).filter(Boolean))];
        const uniqueGameIds = [...new Set(activities.map((a: any) => a.gameId?.toString()).filter(Boolean))];

        const gameQuery: any[] = [];
        if (uniqueProductCodes.length > 0) {
            gameQuery.push({ slug: { $in: uniqueProductCodes } }, { id: { $in: uniqueProductCodes } }, { itchGameId: { $in: uniqueProductCodes } });
        }
        const validGameIds = uniqueGameIds.filter((id: string) => ObjectId.isValid(id)).map(id => new ObjectId(id));
        if (validGameIds.length > 0) {
            gameQuery.push({ _id: { $in: validGameIds } });
        }
        if (uniqueGameIds.length > 0) {
            gameQuery.push({ _id: { $in: uniqueGameIds } });
        }

        const gameMap: Record<string, string> = {};
        if (gameQuery.length > 0) {
            const games = await db.collection("games").find({ $or: gameQuery }).toArray();
            for (const g of games) {
                const title = g.title || g.name || "Unknown Game";
                const idStr = g._id.toString();
                gameMap[idStr] = title;
                if (g.slug) gameMap[g.slug] = title;
                if (g.id) gameMap[g.id] = title;
                if (g.itchGameId) gameMap[g.itchGameId] = title;
                if (typeof g._id === 'string') gameMap[g._id] = title;
            }
        }

        const serialized = activities.map((a: any) => {
            const gIdStr = a.gameId?.toString();
            const gameName = gameMap[gIdStr] || gameMap[a.productCode] || a.productCode || "Unknown Game";
            return {
                id: a._id.toString(),
                type: a.type || 'match_result',
                description: a.description || `Played ${gameName} — earned ${a.earnedXp || 0} XP`,
                xpEarned: a.earnedXp || a.xpEarned || 0,
                productCode: a.productCode || null,
                gameName,
                playTime: a.playTime || 0,
                timestamp: a.timestamp 
                    ? new Date(a.timestamp).toISOString() 
                    : (a.createdAt ? new Date(a.createdAt).toISOString() : null),
                accountId: a.accountId || null,
            };
        });

        return { success: true, activities: serialized, hasMore: activities.length === limit };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
