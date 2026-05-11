"use server";

import { getCollection } from '../mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getBlogPosts } from '../blog';
import { hasPermission } from './rules';

export async function deleteBlogPost(adminUid: string, blogId: string, slug?: string) {
    try {
        const accountsCol = await getCollection('accounts');
        const adminDoc = await accountsCol.findOne({ uid: adminUid });
        
        const canDelete = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'blogs', 'DELETE'));
        
        if (!adminDoc || !canDelete) return { success: false, error: "Unauthorized." };

        const blogsCol = await getCollection('blogs');
        
        let objId;
        try { objId = new ObjectId(blogId); } catch(e) { objId = blogId as any; }

        const blog = await blogsCol.findOne({ _id: objId });
        if (!blog) return { success: false, error: "Post not found." };
        
        const finalSlug = slug || blog.slug;
        
        // Delete blog contents
        const contentsCol = await getCollection('contents');
        await contentsCol.deleteMany({ blogId: blogId });
        
        // Delete the main blog document
        await blogsCol.deleteOne({ _id: objId });
        
        try {
            revalidateTag('blogs', 'max');
            revalidatePath('/blog');
            revalidatePath(`/blog/${finalSlug}`);
            revalidatePath('/blogs');
        } catch (e) {
            console.error('Revalidation failed:', e);
        }
        
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting blog post from MongoDB:", error);
        return { success: false, error: error.message };
    }
}

export async function getBlogPostsAction() {
    try {
        const posts = await getBlogPosts();
        return { success: true, posts };
    } catch (error: any) {
        console.error("Error fetching blogs in action:", error);
        return { success: false, error: error.message };
    }
}

export async function saveBlogPost(adminUid: string, blogData: any) {
    try {
        const accountsCol = await getCollection('accounts');
        const adminDoc = await accountsCol.findOne({ uid: adminUid });
        
        const canSave = adminDoc?.isOwner || (adminDoc?.ruleId && await hasPermission(adminUid, 'blogs', 'WRITE'));
        
        if (!adminDoc || !canSave) return { success: false, error: "Unauthorized." };

        const blogsCol = await getCollection('blogs');
        const contentsCol = await getCollection('contents');
        
        const { id, slug, title, description, content, image, tags, authorId } = blogData;

        if (!slug || !title || !content) {
            return { success: false, error: "Missing required fields (Slug, Title, or Content)." };
        }
        
        const now = new Date();
        const blogPayload: any = {
            slug,
            authorId: authorId || adminUid,
            metatags: {
                title,
                description,
                image: image || "",
                tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()) : []),
                date: now.toISOString()
            },
            status: {
                views: 0,
                likes: 0
            },
            createdAt: now,
            lastUpdated: now
        };

        let finalBlogId: string;

        if (id) {
            // Update existing
            let objId;
            try { objId = new ObjectId(id); } catch(e) { objId = id as any; }
            const { createdAt, ...updatePayload } = blogPayload;
            await blogsCol.updateOne({ _id: objId }, { $set: updatePayload });
            finalBlogId = id;
        } else {
            // Create new
            const result = await blogsCol.insertOne(blogPayload);
            finalBlogId = result.insertedId.toString();
        }

        // Save content
        if (content) {
            await contentsCol.updateOne(
                { blogId: finalBlogId }, 
                { $set: {
                    blogId: finalBlogId,
                    body: content,
                    isApproved: true,
                    editedTime: now
                }},
                { upsert: true }
            );
        }

        revalidatePath('/blog');
        revalidatePath(`/blog/${slug}`);
        revalidatePath('/blogs');
        revalidateTag('blogs', 'max');

        return { success: true, id: finalBlogId };
    } catch (error: any) {
        console.error("Error saving blog post to MongoDB:", error);
        return { success: false, error: error.message };
    }
}
