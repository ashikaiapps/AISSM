import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getInspirationAdapter } from '../adapters/inspiration/base.js';
import * as sourceService from './inspiration-source.service.js';
import * as feedService from './inspiration-feed.service.js';
import type { InspirationSourceType } from '@socialkeys/shared';

export async function fetchSource(sourceId: string, trigger: 'scheduled' | 'manual' = 'scheduled') {
  const [source] = await db
    .select()
    .from(schema.inspirationSources)
    .where(eq(schema.inspirationSources.id, sourceId))
    .limit(1);

  if (!source) throw new Error(`Source not found: ${sourceId}`);

  const runId = crypto.randomUUID();
  await db.insert(schema.inspirationSyncRuns).values({
    id: runId,
    sourceId,
    trigger,
    status: 'running',
    startedAt: new Date().toISOString(),
  });

  try {
    const adapter = getInspirationAdapter(source.type as InspirationSourceType);
    const config = JSON.parse(source.config);
    const rawItems = await adapter.fetchItems(config);

    const inserted = await feedService.upsertItems(sourceId, source.userId, source.type, rawItems);

    await db
      .update(schema.inspirationSyncRuns)
      .set({
        status: 'success',
        finishedAt: new Date().toISOString(),
        itemsFetched: rawItems.length,
        itemsInserted: inserted,
      })
      .where(eq(schema.inspirationSyncRuns.id, runId));

    await sourceService.markFetchSuccess(sourceId);

    return { runId, itemsFetched: rawItems.length, itemsInserted: inserted };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    await db
      .update(schema.inspirationSyncRuns)
      .set({
        status: 'error',
        finishedAt: new Date().toISOString(),
        error: message,
      })
      .where(eq(schema.inspirationSyncRuns.id, runId));

    await sourceService.markFetchError(sourceId, message);

    throw err;
  }
}

export async function fetchAllDue() {
  const dueSources = await sourceService.getSourcesDueForFetch();
  const results: Array<{ sourceId: string; success: boolean; error?: string }> = [];

  for (const source of dueSources) {
    try {
      await fetchSource(source.id, 'scheduled');
      results.push({ sourceId: source.id, success: true });
    } catch (err) {
      results.push({
        sourceId: source.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return results;
}

export async function validateSource(type: InspirationSourceType, config: Record<string, unknown>) {
  const adapter = getInspirationAdapter(type);
  return adapter.validate(config);
}
