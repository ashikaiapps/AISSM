import { Router } from 'express';
import type { InspirationSourceType, InspirationItemStatus } from '@socialkeys/shared';
import * as sourceService from '../services/inspiration-source.service.js';
import * as feedService from '../services/inspiration-feed.service.js';
import * as fetchService from '../services/inspiration-fetch.service.js';
import * as draftService from '../services/inspiration-draft.service.js';

export const inspirationRoutes = Router();

const DEFAULT_USER_ID = 'default-user';

// ─── Sources ───────────────────────────────────────────────────────

// GET /sources — list sources
inspirationRoutes.get('/sources', async (_req, res) => {
  try {
    const sources = await sourceService.listSources(DEFAULT_USER_ID);
    res.json({ sources });
  } catch (err) {
    console.error('Error listing sources:', err);
    res.status(500).json({ error: 'Failed to list sources' });
  }
});

// POST /sources — create source (triggers first fetch)
inspirationRoutes.post('/sources', async (req, res) => {
  try {
    const { type, name, config, fetchIntervalMinutes } = req.body as {
      type: InspirationSourceType;
      name: string;
      config: Record<string, unknown>;
      fetchIntervalMinutes?: number;
    };

    if (!type || !name || !config) {
      return res.status(400).json({ error: 'type, name, and config are required' });
    }

    const source = await sourceService.createSource(DEFAULT_USER_ID, {
      type,
      name,
      config,
      fetchIntervalMinutes,
    });

    // Trigger initial fetch in the background
    fetchService.fetchSource(source.id, 'manual').catch((err) => {
      console.error(`Initial fetch failed for source ${source.id}:`, err);
    });

    res.status(201).json(source);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create source';
    console.error('Error creating source:', err);
    res.status(400).json({ error: message });
  }
});

// PUT /sources/:id — update source
inspirationRoutes.put('/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body as {
      name?: string;
      config?: Record<string, unknown>;
      isActive?: boolean;
      fetchIntervalMinutes?: number;
    };

    const updated = await sourceService.updateSource(DEFAULT_USER_ID, id, data);
    if (!updated) return res.status(404).json({ error: 'Source not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating source:', err);
    res.status(500).json({ error: 'Failed to update source' });
  }
});

// DELETE /sources/:id — delete source
inspirationRoutes.delete('/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await sourceService.deleteSource(DEFAULT_USER_ID, id);
    if (!deleted) return res.status(404).json({ error: 'Source not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting source:', err);
    res.status(500).json({ error: 'Failed to delete source' });
  }
});

// POST /sources/:id/fetch — manual fetch trigger
inspirationRoutes.post('/sources/:id/fetch', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await fetchService.fetchSource(id, 'manual');
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch source';
    console.error('Error fetching source:', err);
    res.status(500).json({ error: message });
  }
});

// POST /sources/validate — validate config + preview
inspirationRoutes.post('/sources/validate', async (req, res) => {
  try {
    const { type, config } = req.body as {
      type: InspirationSourceType;
      config: Record<string, unknown>;
    };

    if (!type || !config) {
      return res.status(400).json({ error: 'type and config are required' });
    }

    const result = await fetchService.validateSource(type, config);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to validate source';
    console.error('Error validating source:', err);
    res.status(500).json({ error: message });
  }
});

// ─── Feed ──────────────────────────────────────────────────────────

// GET /feed — paginated feed with filters
inspirationRoutes.get('/feed', async (req, res) => {
  try {
    const params = {
      type: req.query.type as InspirationSourceType | undefined,
      status: req.query.status as InspirationItemStatus | undefined,
      saved: req.query.saved !== undefined ? req.query.saved === 'true' : undefined,
      search: req.query.search as string | undefined,
      sort: req.query.sort as 'newest' | 'oldest' | 'score' | 'comments' | undefined,
      page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
    };

    const result = await feedService.getFeed(DEFAULT_USER_ID, params);
    res.json(result);
  } catch (err) {
    console.error('Error getting feed:', err);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

// GET /feed/stats — counts
inspirationRoutes.get('/feed/stats', async (_req, res) => {
  try {
    const stats = await feedService.getStats(DEFAULT_USER_ID);
    res.json(stats);
  } catch (err) {
    console.error('Error getting feed stats:', err);
    res.status(500).json({ error: 'Failed to get feed stats' });
  }
});

// PATCH /feed/:id — update item
inspirationRoutes.patch('/feed/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body as {
      status?: InspirationItemStatus;
      isSaved?: boolean;
      notes?: string;
    };

    const updated = await feedService.updateItem(DEFAULT_USER_ID, id, data);
    if (!updated) return res.status(404).json({ error: 'Item not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating item:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// POST /feed/batch — batch update items
inspirationRoutes.post('/feed/batch', async (req, res) => {
  try {
    const { itemIds, action } = req.body as {
      itemIds: string[];
      action: 'markRead' | 'dismiss' | 'save' | 'unsave';
    };

    if (!itemIds || !Array.isArray(itemIds) || !action) {
      return res.status(400).json({ error: 'itemIds[] and action are required' });
    }

    const result = await feedService.batchUpdate(DEFAULT_USER_ID, itemIds, action);
    res.json(result);
  } catch (err) {
    console.error('Error batch updating items:', err);
    res.status(500).json({ error: 'Failed to batch update items' });
  }
});

// POST /feed/:id/to-post — convert to draft post
inspirationRoutes.post('/feed/:id/to-post', async (req, res) => {
  try {
    const { id } = req.params;
    const { caption } = req.body as { caption?: string };

    const post = await draftService.convertToPost(DEFAULT_USER_ID, id, caption);
    res.status(201).json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to convert to post';
    console.error('Error converting to post:', err);
    res.status(400).json({ error: message });
  }
});
