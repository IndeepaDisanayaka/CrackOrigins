import { NextRequest, NextResponse } from 'next/server';

const ITCH_BASE = 'https://itch.io/api/1';

/**
 * GET /api/itch-games
 *   → Returns the list of games from the authenticated itch.io account.
 *
 * GET /api/itch-games?gameId=123456
 *   → Returns full details + uploads for a specific game.
 */
export async function GET(req: NextRequest) {
    const ITCH_API = process.env.ITCH_API;
    if (!ITCH_API) {
        return NextResponse.json({ error: 'ITCH_API not configured on server.' }, { status: 500 });
    }

    const gameId = req.nextUrl.searchParams.get('gameId');

    try {
        if (gameId) {
            // Fetch game details + uploads for a specific game
            const [gameRes, uploadsRes] = await Promise.all([
                fetch(`${ITCH_BASE}/${ITCH_API}/game/${gameId}`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                }),
                fetch(`${ITCH_BASE}/${ITCH_API}/game/${gameId}/uploads`, {
                    headers: { Accept: 'application/json' },
                    cache: 'no-store',
                }),
            ]);

            const gameData = gameRes.ok ? await gameRes.json() : {};
            const uploadsData = uploadsRes.ok ? await uploadsRes.json() : {};

            return NextResponse.json({
                game: gameData.game ?? null,
                uploads: uploadsData.uploads ?? [],
            });
        }

        // Fetch the authenticated user's game list
        const listRes = await fetch(`${ITCH_BASE}/${ITCH_API}/my-games`, {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        });

        if (!listRes.ok) {
            const txt = await listRes.text();
            console.error('itch.io my-games error:', txt);
            return NextResponse.json(
                { error: `itch.io returned ${listRes.status}` },
                { status: 502 }
            );
        }

        const data = await listRes.json();
        return NextResponse.json({ games: data.games ?? [] });
    } catch (err: any) {
        console.error('itch-games API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
