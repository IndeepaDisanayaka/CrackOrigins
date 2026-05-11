import { getMongoDb } from './mongodb';
import { ObjectId } from 'mongodb';
import { Timestamp as FirestoreTimestamp } from './firebase-admin';

export class FirestoreToMongoAdapter {
    collection(name: string) {
        return new MongoCollectionAdapter(name);
    }
    collectionGroup(name: string) {
        let mappedName = name;
        if (name === 'offers') mappedName = 'user_offers';
        return new MongoCollectionAdapter(mappedName, true);
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
        } else if (docData && docData.blogId && collectionName === 'contents') {
            this.path = `blogs/${docData.blogId}/contents/${id}`;
        } else if (docData && docData.ideaId && (collectionName === 'idea_creator_sections' || collectionName === 'idea_collaborations')) {
            const originalSubName = collectionName === 'idea_creator_sections' ? 'creator' : 'collaborations';
            this.path = `ideas/${docData.ideaId}/${originalSubName}/${id}`;
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
        let queryId: any = this.id;
        if (typeof this.id === 'string' && /^[0-9a-fA-F]{24}$/.test(this.id)) {
            try { queryId = new ObjectId(this.id); } catch (e) { queryId = this.id; }
        }
        
        const doc = await db.collection<any>(this.collectionName).findOne({ 
            $or: [{ _id: queryId }, { _id: this.id }, { id: this.id }] 
        });
        return new MongoDocSnapshotAdapter(this.id, doc, this);
    }

    async set(data: any, options?: { merge?: boolean }) {
        const db = await getMongoDb();
        const processed = processTimestamps(data);
        
        // Inject parent relationship if this is a sub-collection doc
        if (this.parentCol && this.parentId) {
            const parentKey = getParentKey(this.parentCol);
            processed[parentKey] = this.parentId;
        }

        let queryId: any = this.id;
        if (typeof this.id === 'string' && /^[0-9a-fA-F]{24}$/.test(this.id)) {
            try { queryId = new ObjectId(this.id); } catch (e) { queryId = this.id; }
        }

        if (options?.merge) {
            const update = processMongoUpdate(processed);
            await db.collection<any>(this.collectionName).updateOne({ _id: queryId }, update, { upsert: true });
        } else {
            await db.collection<any>(this.collectionName).replaceOne({ _id: queryId }, { _id: queryId, ...processed }, { upsert: true });
        }
    }

    async update(data: any) {
        const db = await getMongoDb();
        const update = processMongoUpdate(data);
        let queryId: any = this.id;
        if (typeof this.id === 'string' && /^[0-9a-fA-F]{24}$/.test(this.id)) {
            try { queryId = new ObjectId(this.id); } catch (e) { queryId = this.id; }
        }
        await db.collection<any>(this.collectionName).updateOne({ _id: queryId }, update);
    }

    async delete() {
        const db = await getMongoDb();
        let queryId: any = this.id;
        if (typeof this.id === 'string' && /^[0-9a-fA-F]{24}$/.test(this.id)) {
            try { queryId = new ObjectId(this.id); } catch (e) { queryId = this.id; }
        }
        await db.collection<any>(this.collectionName).deleteOne({ _id: queryId });
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
        return new MongoQueryAdapter(this.name, this.parentCol, this.parentId).where(getParentKey(this.parentCol), '==', this.parentId).get();
    }
    
    where(field: string, op: string, val: any) {
        return new MongoQueryAdapter(this.name, this.parentCol, this.parentId).where(getParentKey(this.parentCol), '==', this.parentId).where(field, op, val);
    }
}

class MongoQueryAdapter {
    private filter: any = {};
    private sort: any = {};
    private limitCount: number = 0;

    constructor(public collectionName: string, public parentCol?: string, public parentId?: string) {}

    where(field: string, op: string, val: any) {
        if (op === '==') this.filter[field] = val;
        else if (op === '>') this.filter[field] = { $gt: val };
        else if (op === '>=') this.filter[field] = { $gte: val };
        else if (op === '<') this.filter[field] = { $lt: val };
        else if (op === '<=') this.filter[field] = { $lte: val };
        else if (op === 'array-contains') this.filter[field] = val;
        else if (op === 'in' && Array.isArray(val)) this.filter[field] = { $in: val };
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
            docs: docs.map(d => new MongoDocSnapshotAdapter(d._id.toString(), d, new MongoDocAdapter(this.collectionName, d._id.toString(), this.parentCol, this.parentId, d))),
            forEach: (cb: any) => docs.forEach(d => cb(new MongoDocSnapshotAdapter(d._id.toString(), d, new MongoDocAdapter(this.collectionName, d._id.toString(), this.parentCol, this.parentId, d))))
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
        const { _id, ...res } = this.dataObj;
        for (const k in res) {
            // Convert to ISO string for Next.js serialization compatibility
            if (res[k] instanceof Date) {
                res[k] = res[k].toISOString();
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
        if (res[k] && typeof res[k] === 'object') {
            if ('toDate' in res[k]) {
                res[k] = res[k].toDate();
            }
        }
    }
    return res;
}

function processMongoUpdate(data: any) {
    if (!data) return { $set: {} };
    const set: any = {};
    const inc: any = {};
    const push: any = {};
    const pull: any = {};

    for (const k in data) {
        const val = data[k];
        if (val && typeof val === 'object' && '_type' in val) {
            if (val._type === 'increment') inc[k] = val.value;
            else if (val._type === 'arrayUnion') push[k] = { $each: val.value };
            else if (val._type === 'arrayRemove') pull[k] = { $in: val.value };
        } else if (val && typeof val === 'object' && 'toDate' in val) {
            set[k] = val.toDate();
        } else {
            set[k] = val;
        }
    }

    const update: any = {};
    if (Object.keys(set).length > 0) update.$set = set;
    if (Object.keys(inc).length > 0) update.$inc = inc;
    if (Object.keys(push).length > 0) update.$push = push;
    if (Object.keys(pull).length > 0) update.$pull = pull;
    
    return update;
}

function getParentKey(parentCol: string) {
    if (parentCol === 'accounts') return 'userId';
    if (parentCol === 'ideas') return 'ideaId';
    if (parentCol === 'blogs') return 'blogId';
    if (parentCol === 'games') return 'gameId';
    return 'parentId';
}
