import { NextRequest } from 'next/server';
import { getCollection } from '@/lib/mongodb';

export const runtime = 'nodejs'; // Required for Change Streams

export async function GET(req: NextRequest) {
    const stream = new ReadableStream({
        async start(controller) {
            let changeStream: any;

            let isClosed = false;

            try {
                const presenceCol = await getCollection("presence");
                changeStream = presenceCol.watch([], { fullDocument: 'updateLookup' });

                const sendEvent = (data: any) => {
                    if (isClosed) return;
                    try {
                        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
                    } catch (e: any) {
                        // Only log if it's NOT a "closed" error, as those are expected when users leave
                        if (e.message?.includes("closed") || e.code === "ERR_INVALID_STATE") return;
                        console.error("Error enqueuing to presence stream:", e);
                    }
                };

                changeStream.on('change', (change: any) => {
                    if (change.operationType === 'insert' || change.operationType === 'update' || change.operationType === 'replace') {
                        sendEvent({
                            type: 'presence_update',
                            doc: change.fullDocument
                        });
                    } else if (change.operationType === 'delete') {
                        sendEvent({
                            type: 'presence_delete',
                            id: change.documentKey._id
                        });
                    }
                });

                changeStream.on('error', (err: any) => {
                    console.error("Presence stream error:", err);
                    controller.error(err);
                });

                req.signal.onabort = () => {
                    isClosed = true;
                    if (changeStream) changeStream.close();
                    try { controller.close(); } catch (e) {}
                };

            } catch (error) {
                console.error("Presence Stream Start Error:", error);
                controller.error(error);
                if (changeStream) changeStream.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function POST(req: NextRequest) {
    const data = await req.json();
    const { id, ...update } = data;
    
    if (!id) return new Response("Missing ID", { status: 400 });

    const presenceCol = await getCollection("presence");
    await presenceCol.updateOne(
        { _id: id as any },
        { $set: { ...update, lastActive: new Date() } },
        { upsert: true }
    );

    return new Response("OK");
}

export async function DELETE(req: NextRequest) {
    const { id } = await req.json();
    if (!id) return new Response("Missing ID", { status: 400 });

    const presenceCol = await getCollection("presence");
    await presenceCol.deleteOne({ _id: id as any });

    return new Response("OK");
}
