import crypto from 'crypto';
import { eq, and, sql, count, desc, asc, like, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { InspirationRawItem } from '../adapters/inspiration/base.js';
import type { InspirationSourceType, InspirationItemStatus } from '@socialkeys/shared';

interface FeedParams {
  type?: InspirationSourceType;
  status?: InspirationItemStatus;
  saved?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'score' | 'comments';
  page?: number;
  limit?: number;
}

export async function getFeed(userId: string, params: FeedParams) {
  const page = Math.max(params.page || 1, 1);
  const limit = Math.min(Math.max(params.limit || 20, 1), 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(schema.inspirationItems.userId, userId)];

  if (params.type) conditions.push(eq(schema.inspirationItems.type, params.type));
  if (params.status) conditions.push(eq(schema.inspirationItems.status, params.status));
  if (params.saved !== undefined) conditions.push(eq(schema.inspirationItems.isSaved, params.saved));
  if (params.search) {
    conditions.push(
      or(
        like(schema.inspirationItems.title, `%${params.search}%`),
        like(schema.inspirationItems.body, `%${params.search}%`),
      )!,
    );
  }

  const where = and(...conditions)!;

  let orderBy;
  switch (params.sort) {
    case 'oldest':
      orderBy = asc(schema.inspirationItems.publishedAt);
      break;
    case 'score':
      orderBy = desc(schema.inspirationItems.score);
      break;
    case 'comments':
      orderBy = desc(schema.inspirationItems.commentCount);
      break;
    default:
      orderBy = desc(schema.inspirationItems.publishedAt);
  }

  const [items, [totalRow]] = await Promise.all([
    db
      .select({
        id: schema.inspirationItems.id,
        sourceId: schema.inspirationItems.sourceId,
        type: schema.inspirationItems.type,
        externalId: schema.inspirationItems.externalId,
        title: schema.inspirationItems.title,
        body: schema.inspirationItems.body,
        url: schema.inspirationItems.url,
        authorName: schema.inspirationItems.authorName,
        authorUrl: schema.inspirationItems.authorUrl,
        thumbnailUrl: schema.inspirationItems.thumbnailUrl,
        score: schema.inspirationItems.score,
        commentCount: schema.inspirationItems.commentCount,
        publishedAt: schema.inspirationItems.publishedAt,
        metadata: schema.inspirationItems.metadata,
        status: schema.inspirationItems.status,
        isSaved: schema.inspirationItems.isSaved,
        notes: schema.inspirationItems.notes,
        draftPostId: schema.inspirationItems.draftPostId,
        createdAt: schema.inspirationItems.createdAt,
        updatedAt: schema.inspirationItems.updatedAt,
        sourceName: schema.inspirationSources.name,
      })
      .from(schema.inspirationItems)
      .innerJoin(schema.inspirationSources, eq(schema.inspirationItems.sourceId, schema.inspirationSources.id))
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ cnt: count() }).from(schema.inspirationItems).where(where),
  ]);

  const total = totalRow.cnt;
  return {
    items: items.map((i) => ({ ...i, metadata: JSON.parse(i.metadata) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getItem(userId: string, itemId: string) {
  const [item] = await db
    .select({
      id: schema.inspirationItems.id,
      sourceId: schema.inspirationItems.sourceId,
      type: schema.inspirationItems.type,
      externalId: schema.inspirationItems.externalId,
      title: schema.inspirationItems.title,
      body: schema.inspirationItems.body,
      url: schema.inspirationItems.url,
      authorName: schema.inspirationItems.authorName,
      authorUrl: schema.inspirationItems.authorUrl,
      thumbnailUrl: schema.inspirationItems.thumbnailUrl,
      score: schema.inspirationItems.score,
      commentCount: schema.inspirationItems.commentCount,
      publishedAt: schema.inspirationItems.publishedAt,
      metadata: schema.inspirationItems.metadata,
      status: schema.inspirationItems.status,
      isSaved: schema.inspirationItems.isSaved,
      notes: schema.inspirationItems.notes,
      draftPostId: schema.inspirationItems.draftPostId,
      createdAt: schema.inspirationItems.createdAt,
      updatedAt: schema.inspirationItems.updatedAt,
      sourceName: schema.inspirationSources.name,
    })
    .from(schema.inspirationItems)
    .innerJoin(schema.inspirationSources, eq(schema.inspirationItems.sourceId, schema.inspirationSources.id))
    .where(and(eq(schema.inspirationItems.id, itemId), eq(schema.inspirationItems.userId, userId)))
    .limit(1);

  if (!item) return null;
  return { ...item, metadata: JSON.parse(item.metadata) };
}

export async function updateItem(
  userId: string,
  itemId: string,
  data: { status?: InspirationItemStatus; isSaved?: boolean; notes?: string },
) {
  const [existing] = await db
    .select()
    .from(schema.inspirationItems)
    .where(and(eq(schema.inspirationItems.id, itemId), eq(schema.inspirationItems.userId, userId)))
    .limit(1);

  if (!existing) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.status !== undefined) updates.status = data.status;
  if (data.isSaved !== undefined) updates.isSaved = data.isSaved;
  if (data.notes !== undefined) updates.notes = data.notes;

  await db
    .update(schema.inspirationItems)
    .set(updates)
    .where(eq(schema.inspirationItems.id, itemId));

  return getItem(userId, itemId);
}

export async function batchUpdate(
  userId: string,
  itemIds: string[],
  action: 'markRead' | 'dismiss' | 'save' | 'unsave',
) {
  if (!itemIds.length) return { updated: 0 };

  const now = new Date().toISOString();
  let updates: Record<string, unknown>;

  switch (action) {
    case 'markRead':
      updates = { status: 'read', updatedAt: now };
      break;
    case 'dismiss':
      updates = { status: 'dismissed', updatedAt: now };
      break;
    case 'save':
      updates = { isSaved: true, status: 'saved', updatedAt: now };
      break;
    case 'unsave':
      updates = { isSaved: false, updatedAt: now };
      break;
    default:
      throw new Error(`Unknown batch action: ${action}`);
  }

  let updated = 0;
  for (const itemId of itemIds) {
    const result = await db
      .update(schema.inspirationItems)
      .set(updates)
      .where(and(eq(schema.inspirationItems.id, itemId), eq(schema.inspirationItems.userId, userId)));
    updated += result.changes;
  }

  return { updated };
}

export async function upsertItems(
  sourceId: string,
  userId: string,
  type: string,
  items: InspirationRawItem[],
) {
  let inserted = 0;

  for (const item of items) {
    try {
      await db.insert(schema.inspirationItems).values({
        id: crypto.randomUUID(),
        sourceId,
        userId,
        type,
        externalId: item.externalId,
        title: item.title,
        body: item.body || null,
        url: item.url,
        authorName: item.authorName || null,
        authorUrl: item.authorUrl || null,
        thumbnailUrl: item.thumbnailUrl || null,
        score: item.score ?? null,
        commentCount: item.commentCount ?? null,
        publishedAt: item.publishedAt || null,
        metadata: JSON.stringify(item.metadata || {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();
      inserted++;
    } catch {
      // Duplicate — skip
    }
  }

  return inserted;
}

export async function getStats(userId: string) {
  const [totalRow] = await db
    .select({ cnt: count() })
    .from(schema.inspirationItems)
    .where(eq(schema.inspirationItems.userId, userId));

  const [unreadRow] = await db
    .select({ cnt: count() })
    .from(schema.inspirationItems)
    .where(and(eq(schema.inspirationItems.userId, userId), eq(schema.inspirationItems.status, 'unread')));

  const [savedRow] = await db
    .select({ cnt: count() })
    .from(schema.inspirationItems)
    .where(and(eq(schema.inspirationItems.userId, userId), eq(schema.inspirationItems.isSaved, true)));

  const [usedRow] = await db
    .select({ cnt: count() })
    .from(schema.inspirationItems)
    .where(and(eq(schema.inspirationItems.userId, userId), eq(schema.inspirationItems.status, 'used')));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayRow] = await db
    .select({ cnt: count() })
    .from(schema.inspirationItems)
    .where(
      and(
        eq(schema.inspirationItems.userId, userId),
        sql`${schema.inspirationItems.createdAt} >= ${today.toISOString()}`,
      ),
    );

  const bySourceRows = await db
    .select({
      sourceId: schema.inspirationSources.id,
      sourceName: schema.inspirationSources.name,
      type: schema.inspirationSources.type,
      count: count(),
    })
    .from(schema.inspirationItems)
    .innerJoin(schema.inspirationSources, eq(schema.inspirationItems.sourceId, schema.inspirationSources.id))
    .where(eq(schema.inspirationItems.userId, userId))
    .groupBy(schema.inspirationSources.id);

  return {
    totalItems: totalRow.cnt,
    unreadCount: unreadRow.cnt,
    savedCount: savedRow.cnt,
    usedCount: usedRow.cnt,
    todayCount: todayRow.cnt,
    bySource: bySourceRows,
  };
}
