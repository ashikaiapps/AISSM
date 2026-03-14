import RSSParser from 'rss-parser';
import type { InspirationSourceAdapter, InspirationRawItem } from './base.js';
import { INSPIRATION_SOURCE_LIMITS } from '@socialkeys/shared';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

interface RSSConfig {
  feedUrl: string;
  limit: number;
}

function parseConfig(config: Record<string, unknown>): RSSConfig {
  const feedUrl = String(config.feedUrl || '').trim();
  const maxItems = INSPIRATION_SOURCE_LIMITS.rss.maxItemsPerFetch;
  const limit = Math.min(Number(config.limit) || 30, maxItems);
  return { feedUrl, limit };
}

const parser = new RSSParser({
  timeout: 30_000,
  maxRedirects: 3,
});

export const rssAdapter: InspirationSourceAdapter = {
  type: 'rss',
  displayName: 'RSS Feed',

  async validate(config) {
    const { feedUrl } = parseConfig(config);
    if (!feedUrl) return { valid: false, error: 'feedUrl is required' };

    try {
      new URL(feedUrl);
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }

    try {
      const feed = await parser.parseURL(feedUrl);
      const name = feed.title || feedUrl;
      const preview = (feed.items || []).slice(0, 3).map((item): InspirationRawItem => ({
        externalId: item.guid || item.link || item.title || '',
        title: item.title || 'Untitled',
        body: item.contentSnippet ? stripHtml(item.contentSnippet).slice(0, 500) : undefined,
        url: item.link || feedUrl,
        authorName: item.creator || item.author,
        publishedAt: item.isoDate || undefined,
      }));

      return { valid: true, name, preview };
    } catch (err) {
      return { valid: false, error: `Failed to parse RSS feed: ${(err as Error).message}` };
    }
  },

  async fetchItems(config) {
    const { feedUrl, limit } = parseConfig(config);
    if (!feedUrl) return [];

    const feed = await parser.parseURL(feedUrl);
    const feedItems = (feed.items || []).slice(0, limit);

    return feedItems.map((item): InspirationRawItem => {
      const enclosure = item.enclosure as { url?: string } | undefined;
      return {
        externalId: item.guid || item.link || item.title || crypto.randomUUID(),
        title: item.title || 'Untitled',
        body: item.contentSnippet ? stripHtml(item.contentSnippet).slice(0, 2000) : undefined,
        url: item.link || feedUrl,
        authorName: item.creator || item.author,
        thumbnailUrl: enclosure?.url,
        publishedAt: item.isoDate || undefined,
        metadata: {
          feedTitle: feed.title,
          categories: item.categories || [],
        },
      };
    });
  },
};
