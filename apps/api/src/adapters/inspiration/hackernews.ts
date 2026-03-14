import type { InspirationSourceAdapter, InspirationRawItem } from './base.js';
import { INSPIRATION_SOURCE_LIMITS } from '@socialkeys/shared';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

type HNFeed = 'top' | 'best' | 'new';

interface HNConfig {
  feed: HNFeed;
  limit: number;
}

function parseConfig(config: Record<string, unknown>): HNConfig {
  const feed = (['top', 'best', 'new'].includes(String(config.feed)) ? String(config.feed) : 'top') as HNFeed;
  const maxItems = INSPIRATION_SOURCE_LIMITS.hackernews.maxItemsPerFetch;
  const limit = Math.min(Number(config.limit) || 30, maxItems);
  return { feed, limit };
}

const BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  url?: string;
  by?: string;
  score?: number;
  descendants?: number;
  time?: number;
  type?: string;
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetchWithTimeout(`${BASE}/item/${id}.json`);
    if (!res.ok) return null;
    return await res.json() as HNItem;
  } catch {
    return null;
  }
}

export const hackernewsAdapter: InspirationSourceAdapter = {
  type: 'hackernews',
  displayName: 'Hacker News',

  async validate(config) {
    const { feed } = parseConfig(config);
    try {
      const res = await fetchWithTimeout(`${BASE}/${feed}stories.json`);
      if (!res.ok) return { valid: false, error: `HN API error: HTTP ${res.status}` };

      const ids = await res.json() as number[];
      if (!Array.isArray(ids) || ids.length === 0) return { valid: false, error: 'No stories found' };

      const preview = await this.fetchItems({ ...config, limit: 3 });
      return { valid: true, name: `HN ${feed.charAt(0).toUpperCase() + feed.slice(1)} Stories`, preview };
    } catch (err) {
      return { valid: false, error: `Failed to validate HN feed: ${(err as Error).message}` };
    }
  },

  async fetchItems(config) {
    const { feed, limit } = parseConfig(config);

    const res = await fetchWithTimeout(`${BASE}/${feed}stories.json`);
    if (!res.ok) throw new Error(`HN API error: HTTP ${res.status}`);

    const ids = (await res.json() as number[]).slice(0, limit);
    const items: InspirationRawItem[] = [];

    // Fetch in batches of 5 concurrently
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map((id) => fetchItem(id)));

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const item = result.value;
        if (!item.title || item.type !== 'story') continue;

        items.push({
          externalId: String(item.id),
          title: item.title,
          body: item.text ? stripHtml(item.text).slice(0, 2000) : undefined,
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          authorName: item.by,
          authorUrl: item.by ? `https://news.ycombinator.com/user?id=${item.by}` : undefined,
          score: item.score,
          commentCount: item.descendants,
          publishedAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
          metadata: {
            hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
          },
        });
      }
    }

    return items;
  },
};
