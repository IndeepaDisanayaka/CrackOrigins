import { getMongoDb } from './mongodb';
import { ObjectId } from 'mongodb';
import { Timestamp as FirestoreTimestamp } from 'firebase-admin/firestore';

export class FirestoreToMongoAdapter {
    collection(name: string) {
        return new MongoCollectionAdapter(name);
    }
    collectionGroup(name: string) {
        return new MongoCollectionAdapter(name, true);
    }
    batch() {
        return new MongoBatchAdapter();
    }
}

class MongoCollectionAdapter {
    constructor(public name: string, public isGroup = false) {}

    doc(id?: string) {
        const docId = id || new ObjectId().toHexString();
        return new MongoDocAdapter(this.name, docId);
    }

    async add(data: any) {
        const docRef = this.doc();
        await docRef.set(data);
        return docRef;
    }

    where(field: string, op: string, val: any) {
        return new MongoQueryAdapter(this.name).where(field, op, val);
    }

    orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
        return new MongoQueryAdapter(this.name).orderBy(field, dir);
    }

    limit(n: number) {
        return new MongoQueryAdapter(this.name).limit(n);
    }

    async get() {
        return new MongoQueryAdapter(this.name).get();
    }
}

class MongoDocAdapter {
    public path: string;
    constructor(public collectionName: string, public id: string, public parentCol?: string, public parentId?: string, private docData?: any) {
        if (parentCol && parentId) {
            // Keep original Firestore path structure for scripts that rely on it
            const originalSubName = collectionName === 'user_offers' ? 'offers' : 
                                  collectionName === 'idea_creator_sections' ? 'creator' :
                                  collectionName === 'idea_collaborations' ? 'collaborations' : collectionName;
            this.path = `${parentCol}/${parentId}/${originalSubName}/${id}`;
        } else if (docData && docData.userId && (collectionName === 'payments' || collectionName === 'user_offers' || collectionName === 'affiliates')) {
            const originalSubName = collectionName === 'user_offers' ? 'offers' : collectionName;
            this.path = `accounts/${docData.userId}/${originalSubName}/${id}`;
        } else {
            this.path = `${collectionName}/${id}`;
        }
    }

    collection(subName: string) {
        // Map subcollections to top level based on migration script
        let topLevelName = subName;
        if (this.collectionName === 'accounts') {
            if (subName === 'offers') topLevelName = 'user_offers';
        } else if (this.collectionName === 'ideas') {
            if (subName === 'creator') topLevelName = 'idea_creator_sections';
            if (subName === 'collaborations') topLevelName = 'idea_collaborations';
        }
        
        return new MongoSubCollectionAdapter(topLevelName, this.collectionName, this.id);
    }

    async get() {
        const db = await getMongoDb();
        const doc = await db.collection<any>(this.collectionName).findOne({ _id: this.id });
        return new MongoDocSnapshotAdapter(this.id, doc, this);
    }

    async set(data: any, options?: { merge?: boolean }) {
        const db = await getMongoDb();
        const updateData = processTimestamps(data);
        if (options?.merge) {
            await db.collection<any>(this.collectionName).updateOne({ _id: this.id }, { $set: updateData }, { upsert: true });
        } else {
            await db.collection<any>(this.collectionName).replaceOne({ _id: this.id }, { _id: this.id, ...updateData }, { upsert: true });
        }
    }

    async update(data: any) {
        const db = await getMongoDb();
        const updateData = processTimestamps(data);
        await db.collection<any>(this.collectionName).updateOne({ _id: this.id }, { $set: updateData });
    }

    async delete() {
        const db = await getMongoDb();
        await db.collection<any>(this.collectionName).deleteOne({ _id: this.id });
    }
}

class MongoSubCollectionAdapter extends MongoCollectionAdapter {
    constructor(name: string, public parentCol: string, public parentId: string) {
        super(name);
    }

    doc(id?: string) {
        const docId = id || new ObjectId().toHexString();
        // Return a doc adapter but aware of subcollection identity
        return new MongoDocAdapter(this.name, docId, this.parentCol, this.parentId);
    }

    async get() {
        return new MongoQueryAdapter(this.name).where(getParentKey(this.parentCol), '==', this.parentId).get();
    }
    
    where(field: string, op: string, val: any) {
        return new MongoQueryAdapter(this.name).where(getParentKey(this.parentCol), '==', this.parentId).where(field, op, val);
    }
}

class MongoQueryAdapter {
    private filter: any = {};
    private sort: any = {};
    private limitCount: number = 0;

    constructor(public collectionName: string) {}

    where(field: string, op: string, val: any) {
        if (op === '==') this.filter[field] = val;
        else if (op === '>') this.filter[field] = { $gt: val };
        else if (op === '>=') this.filter[field] = { $gte: val };
        else if (op === '<') this.filter[field] = { $lt: val };
        else if (op === '<=') this.filter[field] = { $lte: val };
        else if (op === 'array-contains') this.filter[field] = val;
        return this;
    }

    orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
        this.sort[field] = dir === 'asc' ? 1 : -1;
        return this;
    }

    limit(n: number) {
        this.limitCount = n;
        return this;
    }

    async get() {
        const db = await getMongoDb();
        let cursor = db.collection<any>(this.collectionName).find(this.filter);
        if (Object.keys(this.sort).length > 0) cursor = cursor.sort(this.sort);
        if (this.limitCount > 0) cursor = cursor.limit(this.limitCount);
        
        const docs = await cursor.toArray();
        return {
            empty: docs.length === 0,
            size: docs.length,
            docs: docs.map(d => new MongoDocSnapshotAdapter(d._id.toString(), d, new MongoDocAdapter(this.collectionName, d._id.toString(), undefined, undefined, d))),
            forEach: (cb: any) => docs.forEach(d => cb(new MongoDocSnapshotAdapter(d._id.toString(), d, new MongoDocAdapter(this.collectionName, d._id.toString(), undefined, undefined, d))))
        };
    }
}

class MongoDocSnapshotAdapter {
    public exists: boolean;
    constructor(public id: string, private dataObj: any, public ref: MongoDocAdapter) {
        this.exists = !!dataObj;
    }
    data() {
        if (!this.dataObj) return undefined;
        const res = { ...this.dataObj };
        for (const k in res) {
            // Convert back to Firestore Timestamp for compatibility if it's a date
            if (res[k] instanceof Date) {
                res[k] = FirestoreTimestamp.fromDate(res[k]);
            }
        }
        return res;
    }
}

class MongoBatchAdapter {
    private ops: any[] = [];
    
    set(ref: MongoDocAdapter, data: any, options?: { merge?: boolean }) {
        this.ops.push(async () => await ref.set(data, options));
    }
    update(ref: MongoDocAdapter, data: any) {
        this.ops.push(async () => await ref.update(data));
    }
    delete(ref: MongoDocAdapter) {
        this.ops.push(async () => await ref.delete());
    }
    async commit() {
        for (const op of this.ops) {
            await op();
        }
    }
}

function processTimestamps(data: any) {
    if (!data) return data;
    const res = { ...data };
    for (const k in res) {
        if (res[k] && typeof res[k] === 'object' && 'toDate' in res[k]) {
            res[k] = res[k].toDate();
        }
    }
    return res;
}

function getParentKey(parentCol: string) {
    if (parentCol === 'accounts') return 'userId';
    if (parentCol === 'ideas') return 'ideaId';
    return 'parentId';
}
