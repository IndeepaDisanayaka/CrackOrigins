"use server";

import { getCollection, getMongoDb } from './mongodb';
import { ObjectId } from 'mongodb';

export async function incrementBlogViews(blogId: string) {
    try {
        const blogsCol = await getCollection('blogs');
        let objId;
        try { objId = new ObjectId(blogId); } catch(e) { objId = blogId as any; }
        
        await blogsCol.updateOne(
            { _id: objId },
            { $inc: { 'status.views': 1 } }
        );
        
        return { success: true };
    } catch (error: any) {
        console.error("Error incrementing views:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Handle blog likes (Simple increment/decrement)
 */
export async function toggleBlogLikeSimple(blogId: string, increment: boolean) {
    try {
        const blogsCol = await getCollection('blogs');
        let objId;
        try { objId = new ObjectId(blogId); } catch(e) { objId = blogId as any; }
        
        await blogsCol.updateOne(
            { _id: objId },
            { $inc: { 'status.likes': increment ? 1 : -1 } }
        );
        
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling like:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Blog Comments Actions
 */
export async function getBlogComments(blogId: string, page = 1, limit = 10) {
    try {
        const commentsCol = await getCollection('blog_comments');
        const skip = (page - 1) * limit;
        
        const comments = await commentsCol.find({ blogId })
            .sort({ commenteddatetime: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
            
        return { 
            success: true, 
            comments: comments.map(c => ({
                id: c._id.toString(),
                userId: c.userId,
                blogId: c.blogId,
                comment: c.comment,
                userName: c.userName || 'Operative',
                userAvatar: c.userAvatar || null,
                role: c.role || 'user',
                likes: c.likes || 0,
                commenteddatetime: c.commenteddatetime ? new Date(c.commenteddatetime).toISOString() : null
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function upsertBlogComment(blogId: string, userId: string, data: any) {
    try {
        const commentsCol = await getCollection('blog_comments');
        const payload = {
            ...data,
            blogId,
            userId,
            commenteddatetime: data.commenteddatetime || new Date(),
            lastUpdated: new Date()
        };
        
        await commentsCol.updateOne(
            { blogId, userId },
            { $set: payload },
            { upsert: true }
        );
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteBlogComment(blogId: string, userId: string) {
    try {
        const commentsCol = await getCollection('blog_comments');
        await commentsCol.deleteOne({ blogId, userId });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function toggleCommentLike(blogId: string, commentUserId: string, increment: boolean) {
    try {
        const commentsCol = await getCollection('blog_comments');
        await commentsCol.updateOne(
            { blogId, userId: commentUserId },
            { $inc: { likes: increment ? 1 : -1 } }
        );
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

