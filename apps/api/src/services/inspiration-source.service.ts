import crypto from 'crypto';
import { eq, and, sql, count, lt, or, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { INSPIRATION_SOURCE_LIMITS } from '@socialkeys/shared';
import type { InspirationSourceType } from '@socialkeys/shared';

export async function listSources(userId: string) {
  const sources = await db
    .select({
      id: schema.inspirationSources.id,
      type: schema.inspirationSources.type,
      name: schema.inspirationSources.name,
      config: schema.inspirationSources.config,
      isActive: schema.inspirationSources.isActive,
      fetchIntervalMinutes: schema.inspirationSources.fetchIntervalMinutes,
      lastFetchedAt: schema.inspirationSources.lastFetchedAt,
      errorCount: schema.inspirationSources.errorCount,
      lastError: schema.inspirationSources.lastError,
      createdAt: schema.inspirationSources.createdAt,
      updatedAt: schema.inspirationSources.updatedAt,
      itemCount: sql<number>`(SELECT COUNT(*) FROM inspiration_items WHERE source_id = ${schema.inspirationSources.id})`.as('item_count'),
    })
    .from(schema.inspirationSources)
    .where(eq(schema.inspirationSources.userId, userId))
    .orderBy(schema.inspirationSources.createdAt);

  return sources.map((s) => ({
    ...s,
    config: JSON.parse(s.config),
  }));
}

export async function createSource(
  userId: string,
  data: { type: InspirationSourceType; name: string; config: Record<string, unknown>; fetchIntervalMinutes?: number },
) {
  const limits = INSPIRATION_SOURCE_LIMITS[data.type];
  if (!limits) throw new Error(`Unsupported source type: ${data.type}`);

  // Check max sources limit
  const [existing] = await db
    .select({ cnt: count() })
    .from(schema.inspirationSources)
    .where(and(eq(schema.inspirationSources.userId, userId), eq(schema.inspirationSources.type, data.type)));

  if (existing.cnt >= limits.maxSources) {
    throw new Error(`Maximum ${limits.maxSources} ${data.type} sources allowed`);
  }

  const interval = Math.max(
    data.fetchIntervalMinutes ?? limits.defaultFetchIntervalMinutes,
    limits.minFetchIntervalMinutes,
  );

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.insert(schema.inspirationSources).values({
    id,
    userId,
    type: data.type,
    name: data.name,
    config: JSON.stringify(data.config),
    fetchIntervalMinutes: interval,
    createdAt: now,
    updatedAt: now,
  });

  const [source] = await db
    .select()
    .from(schema.inspirationSources)
    .where(eq(schema.inspirationSources.id, id))
    .limit(1);

  return { ...source, config: JSON.parse(source.config) };
}

export async function updateSource(
  userId: string,
  sourceId: string,
  data: { name?: string; config?: Record<string, unknown>; isActive?: boolean; fetchIntervalMinutes?: number },
) {
  const [existing] = await db
    .select()
    .from(schema.inspirationSources)
    .where(and(eq(schema.inspirationSources.id, sourceId), eq(schema.inspirationSources.userId, userId)))
    .limit(1);

  if (!existing) return null;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.config !== undefined) updates.config = JSON.stringify(data.config);
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.fetchIntervalMinutes !== undefined) {
    const limits = INSPIRATION_SOURCE_LIMITS[existing.type as InspirationSourceType];
    updates.fetchIntervalMinutes = Math.max(data.fetchIntervalMinutes, limits?.minFetchIntervalMinutes ?? 15);
  }

  await db
    .update(schema.inspirationSources)
    .set(updates)
    .where(eq(schema.inspirationSources.id, sourceId));

  const [updated] = await db
    .select()
    .from(schema.inspirationSources)
    .where(eq(schema.inspirationSources.id, sourceId))
    .limit(1);

  return { ...updated, config: JSON.parse(updated.config) };
}

export async function deleteSource(userId: string, sourceId: string) {
  const [existing] = await db
    .select()
    .from(schema.inspirationSources)
    .where(and(eq(schema.inspirationSources.id, sourceId), eq(schema.inspirationSources.userId, userId)))
    .limit(1);

  if (!existing) return false;

  await db
    .delete(schema.inspirationSources)
    .where(eq(schema.inspirationSources.id, sourceId));

  return true;
}

export async function getSourcesDueForFetch() {
  const now = new Date();

  const sources = await db
    .select()
    .from(schema.inspirationSources)
    .where(
      and(
        eq(schema.inspirationSources.isActive, true),
        lt(schema.inspirationSources.errorCount, 5),
        or(
          isNull(schema.inspirationSources.lastFetchedAt),
          sql`datetime(${schema.inspirationSources.lastFetchedAt}, '+' || ${schema.inspirationSources.fetchIntervalMinutes} || ' minutes') <= datetime('now')`,
        ),
      ),
    );

  return sources.map((s) => ({ ...s, config: JSON.parse(s.config) }));
}

export async function markFetchSuccess(sourceId: string) {
  await db
    .update(schema.inspirationSources)
    .set({
      lastFetchedAt: new Date().toISOString(),
      errorCount: 0,
      lastError: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.inspirationSources.id, sourceId));
}

export async function markFetchError(sourceId: string, error: string) {
  await db
    .update(schema.inspirationSources)
    .set({
      errorCount: sql`${schema.inspirationSources.errorCount} + 1`,
      lastError: error,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.inspirationSources.id, sourceId));
}
