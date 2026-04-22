import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/**
 * POST /api/itch-sync
 * Body: { adminUid: string, gameId: string, itchUploadId: string }
 *
 * Fetches game data from itch.io using the ITCH_API key and updates
 * the corresponding Firestore document with title, description, and cover image.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { adminUid, gameId, itchUploadId } = body as {
            adminUid: string;
            gameId: string;
            itchUploadId: string;
        };

        if (!adminUid || !gameId || !itchUploadId) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        const ITCH_API = process.env.ITCH_API;
        if (!ITCH_API) {
            return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
        }

        // 1. Verify admin
        const adminDb = await getAdminDb();
        const adminDoc = await adminDb.collection('accounts').doc(adminUid).get();
        if (!adminDoc.exists || !adminDoc.data()?.isOwner) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
        }

        // 2. Fetch upload info from itch.io
        const uploadRes = await fetch(
            `https://itch.io/api/1/${ITCH_API}/upload/${itchUploadId}`,
            { headers: { 'Accept': 'application/json' }, cache: 'no-store' }
        );

        if (!uploadRes.ok) {
            const txt = await uploadRes.text();
            console.error('itch.io upload fetch failed:', txt);
            return NextResponse.json({ error: `itch.io error: ${uploadRes.status}` }, { status: 502 });
        }

        const uploadData = await uploadRes.json();
        // The upload endpoint returns the upload object which includes a 'game' sub-object
        const itchGame = uploadData?.upload?.game ?? uploadData?.game;
        const itchUpload = uploadData?.upload ?? uploadData;

        if (!itchGame && !itchUpload) {
            return NextResponse.json({ error: 'Could not parse itch.io response.' }, { status: 502 });
        }

        // 3. Extract useful fields
        const updates: Record<string, any> = {};

        const title = itchGame?.title ?? itchUpload?.display_name ?? null;
        if (title) updates.title = title;

        const description = itchGame?.short_text ?? itchGame?.description ?? null;
        if (description) updates.description = description;

        // Cover image — itch.io provides cover_url on the game object
        const coverUrl = itchGame?.cover_url ?? null;
        if (coverUrl) {
            updates.image = coverUrl;
            // Also prepend to the images array if not already there
        }

        // Screenshots (if available)
        const screenshots: string[] = [];
        if (Array.isArray(itchGame?.screenshots)) {
            for (const s of itchGame.screenshots) {
                if (s?.url) screenshots.push(s.url);
            }
        }
        if (screenshots.length > 0) updates.images = screenshots;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ success: true, message: 'No new data to sync from itch.io.' });
        }

        // 4. Update Firestore game document
        await adminDb.collection('games').doc(gameId).update(updates);

        return NextResponse.json({ success: true, synced: updates });
    } catch (err: any) {
        console.error('itch-sync error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
    }
}
