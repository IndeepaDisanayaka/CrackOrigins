import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/download?uploadId=16013605
 *
 * Server-side proxy: Calls the itch.io API to get a signed download URL
 * for a given upload ID, then redirects the user to it.
 * The ITCH_API key never reaches the client.
 */
export async function GET(req: NextRequest) {
    const uploadId = req.nextUrl.searchParams.get('uploadId');

    if (!uploadId) {
        return NextResponse.json({ error: 'Missing uploadId parameter.' }, { status: 400 });
    }

    const ITCH_API = process.env.ITCH_API;
    if (!ITCH_API) {
        console.error('ITCH_API environment variable is not set.');
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    try {
        // Ask itch.io for a signed download URL for this upload
        const itchUrl = `https://itch.io/api/1/${ITCH_API}/upload/${uploadId}/download`;
        const itchRes = await fetch(itchUrl, {
            headers: { 'Accept': 'application/json' },
            // Do NOT cache — each call must produce a fresh signed URL
            cache: 'no-store',
        });

        if (!itchRes.ok) {
            const body = await itchRes.text();
            console.error(`itch.io API error (${itchRes.status}):`, body);
            return NextResponse.json(
                { error: `itch.io returned ${itchRes.status}. The file may be private or the upload ID is invalid.` },
                { status: 502 }
            );
        }

        const data = await itchRes.json();

        // itch.io returns { url: "https://..." } for direct download
        const downloadUrl: string | undefined = data?.url;
        if (!downloadUrl) {
            console.error('itch.io API did not return a download URL:', data);
            return NextResponse.json({ error: 'Could not retrieve download URL from itch.io.' }, { status: 502 });
        }

        // Redirect the user to the signed download URL
        return NextResponse.redirect(downloadUrl);
    } catch (err: any) {
        console.error('Download proxy error:', err);
        return NextResponse.json({ error: 'Failed to process download request.' }, { status: 500 });
    }
}
