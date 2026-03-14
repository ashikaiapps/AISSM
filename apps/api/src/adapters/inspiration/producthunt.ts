import RSSParser from 'rss-parser';
import type { InspirationSourceAdapter, InspirationRawItem } from './base.js';
import { INSPIRATION_SOURCE_LIMITS } from '@socialkeys/shared';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

interface PHConfig {
  topic?: string;
  limit: number;
}

function parseConfig(config: Record<string, unknown>): PHConfig {
  const topic = config.topic ? String(config.topic).trim() : undefined;
  const maxItems = INSPIRATION_SOURCE_LIMITS.producthunt.maxItemsPerFetch;
  const limit = Math.min(Number(config.limit) || 20, maxItems);
  return { topic, limit };
}

const parser = new RSSParser({
  timeout: 30_000,
  maxRedirects: 3,
});

function buildFeedUrl(topic?: string): string {
  if (topic) {
    return `https://www.producthunt.com/topics/${encodeURIComponent(topic)}/feed`;
  }
  return 'https://www.producthunt.com/feed';
}

export const producthuntAdapter: InspirationSourceAdapter = {
  type: 'producthunt',
  displayName: 'Product Hunt',

  async validate(config) {
    const { topic } = parseConfig(config);
    const feedUrl = buildFeedUrl(topic);

    try {
      const feed = await parser.parseURL(feedUrl);
      const name = feed.title || (topic ? `Product Hunt – ${topic}` : 'Product Hunt');
      const preview = (feed.items || []).slice(0, 3).map((item): InspirationRawItem => ({
        externalId: item.guid || item.link || item.title || '',
        title: item.title || 'Untitled',
        body: item.contentSnippet ? stripHtml(item.contentSnippet).slice(0, 500) : undefined,
        url: item.link || feedUrl,
        publishedAt: item.isoDate || undefined,
      }));

      return { valid: true, name, preview };
    } catch (err) {
      return { valid: false, error: `Failed to validate Product Hunt feed: ${(err as Error).message}` };
    }
  },

  async fetchItems(config) {
    const { topic, limit } = parseConfig(config);
    const feedUrl = buildFeedUrl(topic);

    const feed = await parser.parseURL(feedUrl);
    const feedItems = (feed.items || []).slice(0, limit);

    return feedItems.map((item): InspirationRawItem => ({
      externalId: item.guid || item.link || item.title || crypto.randomUUID(),
      title: item.title || 'Untitled',
      body: item.contentSnippet ? stripHtml(item.contentSnippet).slice(0, 2000) : undefined,
      url: item.link || feedUrl,
      authorName: item.creator || item.author,
      publishedAt: item.isoDate || undefined,
      metadata: {
        feedTitle: feed.title,
        topic: topic || null,
        categories: item.categories || [],
      },
    }));
  },
};
