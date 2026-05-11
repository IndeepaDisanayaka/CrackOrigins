import { NextRequest } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId'); // If provided, stream specific chat
    const isAdmin = searchParams.get('isAdmin') === 'true';

    const stream = new ReadableStream({
        async start(controller) {
            let chatStream: any;
            let msgStream: any;

            let isClosed = false;

            try {
                const chatsCol = await getCollection("support_chats");
                const msgsCol = await getCollection("support_messages");

                const sendEvent = (type: string, data: any) => {
                    if (isClosed) return;
                    try {
                        controller.enqueue(`data: ${JSON.stringify({ type, ...data })}\n\n`);
                    } catch (e: any) {
                        if (e.message?.includes("closed") || e.code === "ERR_INVALID_STATE") return;
                        console.error("Error enqueuing to stream:", e);
                    }
                };

                // Watch for chat metadata changes
                chatStream = chatsCol.watch(
                    [{ $match: { 'fullDocument._id': userId ? userId : { $exists: true } } }],
                    { fullDocument: 'updateLookup' }
                );

                chatStream.on('change', (change: any) => {
                    if (['insert', 'update', 'replace'].includes(change.operationType)) {
                        sendEvent('chat_update', { chat: change.fullDocument });
                    }
                });

                chatStream.on('error', (err: any) => {
                    console.error("Chat stream error:", err);
                    controller.error(err);
                });

                // Watch for new messages
                msgStream = msgsCol.watch(
                    userId ? [{ $match: { 'fullDocument.chatId': userId } }] : [],
                    { fullDocument: 'updateLookup' }
                );

                msgStream.on('change', (change: any) => {
                    if (change.operationType === 'insert') {
                        sendEvent('new_message', { message: change.fullDocument });
                    }
                });

                msgStream.on('error', (err: any) => {
                    console.error("Message stream error:", err);
                    controller.error(err);
                });

                req.signal.onabort = () => {
                    isClosed = true;
                    if (chatStream) chatStream.close();
                    if (msgStream) msgStream.close();
                    try { controller.close(); } catch (e) {}
                };

            } catch (error) {
                console.error("MongoDB Stream Start Error:", error);
                controller.error(error);
                if (chatStream) chatStream.close();
                if (msgStream) msgStream.close();
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
    const { chatId, text, senderId, senderName } = data;

    if (!chatId || !text) return new Response("Missing data", { status: 400 });

    const chatsCol = await getCollection("support_chats");
    const msgsCol = await getCollection("support_messages");

    // Update chat metadata
    await chatsCol.updateOne(
        { _id: chatId as any },
        { 
            $set: { 
                lastMessage: text, 
                updatedAt: new Date(),
                name: senderName || 'Guest'
            },
            $setOnInsert: { createdAt: new Date(), status: 'open' }
        },
        { upsert: true }
    );

    // Insert message
    await msgsCol.insertOne({
        chatId,
        text,
        senderId,
        senderName,
        timestamp: new Date()
    });

    return new Response("OK");
}

export async function PATCH(req: NextRequest) {
    const data = await req.json();
    const { chatId, ownerId, ownerName, status } = data;

    if (!chatId) return new Response("Missing chatId", { status: 400 });

    const chatsCol = await getCollection("support_chats");
    await chatsCol.updateOne(
        { _id: chatId as any },
        { $set: { ownerId, ownerName, status: status || 'active', updatedAt: new Date() } }
    );

    return new Response("OK");
}
