import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export async function convertToPost(userId: string, itemId: string, caption?: string) {
  const [item] = await db
    .select()
    .from(schema.inspirationItems)
    .where(and(eq(schema.inspirationItems.id, itemId), eq(schema.inspirationItems.userId, userId)))
    .limit(1);

  if (!item) throw new Error('Inspiration item not found');

  const postId = crypto.randomUUID();
  const now = new Date().toISOString();

  const postCaption = caption || `${item.title}\n\n${item.url}`;

  await db.insert(schema.posts).values({
    id: postId,
    userId,
    caption: postCaption,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(schema.inspirationItems)
    .set({
      status: 'used',
      draftPostId: postId,
      updatedAt: now,
    })
    .where(eq(schema.inspirationItems.id, itemId));

  const [post] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, postId))
    .limit(1);

  return post;
}
