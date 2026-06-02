import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
    try {
        let { newName, oldName, productCode, uid } = await req.json();

        // 1. Basic Validation
        if (!newName || !productCode || !uid) {
            return NextResponse.json({ 
                success: false, 
                error: 'New name, product code, and UID are required.' 
            }, { status: 400 });
        }

        // Apply trim
        newName = newName.trim();

        // 2. Validate newName format
        // Max 20 characters
        if (newName.length > 20) {
            return NextResponse.json({ 
                success: false, 
                error: 'Name must be 20 characters or less.' 
            }, { status: 400 });
        }

        // Only letters and spaces (no symbols, no numbers)
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(newName)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Name can only contain letters and spaces (no numbers or symbols).' 
            }, { status: 400 });
        }

        const db = await getMongoDb();

        // 3. Validate Product Code
        let gameQuery: any = { 
            $or: [
                { slug: productCode },
                { id: productCode },
                { itchGameId: productCode.toString() }
            ] 
        };
        try { if (ObjectId.isValid(productCode)) gameQuery.$or.push({ _id: new ObjectId(productCode) }); } catch(e) {}

        const game = await db.collection('games').findOne(gameQuery);
        if (!game) {
            return NextResponse.json({ success: false, error: 'Invalid product code.' }, { status: 403 });
        }

        // 4. Validate User (UID)
        let userQuery: any = { 
            $or: [
                { _id: uid as any }, 
                { uid: uid } 
            ] 
        };
        try { if (ObjectId.isValid(uid)) userQuery.$or.push({ _id: new ObjectId(uid) }); } catch(e) {}

        const user = await db.collection('accounts').findOne(userQuery);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
        }

        // 5. Update the Account Name
        await db.collection('accounts').updateOne(
            { _id: user._id },
            { 
                $set: { 
                    name: newName,
                    displayName: newName,
                    updatedAt: new Date() 
                }
            }
        );

        return NextResponse.json({ 
            success: true, 
            message: 'Account name updated successfully.',
            oldName: oldName || user.name || user.displayName,
            newName: newName
        });

    } catch (error: any) {
        console.error('Update Name Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An internal error occurred.' 
        }, { status: 500 });
    }
}
