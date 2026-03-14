import RSSParser from 'rss-parser';
import type { InspirationSourceAdapter, InspirationRawItem } from './base.js';
import { INSPIRATION_SOURCE_LIMITS } from '@socialkeys/shared';
import { env } from '../../config/env.js';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

interface YouTubeConfig {
  channelId: string;
  limit: number;
}

function parseConfig(config: Record<string, unknown>): YouTubeConfig {
  const channelId = String(config.channelId || '').trim();
  const maxItems = INSPIRATION_SOURCE_LIMITS.youtube.maxItemsPerFetch;
  const limit = Math.min(Number(config.limit) || 15, maxItems);
  return { channelId, limit };
}

const rssParser = new RSSParser({
  timeout: 30_000,
  maxRedirects: 3,
  customFields: {
    item: [
      ['yt:videoId', 'ytVideoId'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

interface YTRssItem {
  ytVideoId?: string;
  title?: string;
  link?: string;
  author?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  mediaGroup?: {
    'media:thumbnail'?: Array<{ $?: { url?: string } }>;
    'media:description'?: string[];
  };
}

export const youtubeAdapter: InspirationSourceAdapter = {
  type: 'youtube',
  displayName: 'YouTube',

  async validate(config) {
    const { channelId } = parseConfig(config);
    if (!channelId) return { valid: false, error: 'channelId is required' };

    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
      const feed = await rssParser.parseURL(feedUrl);
      const name = feed.title || `YouTube Channel ${channelId}`;
      const preview = await this.fetchItems({ ...config, limit: 3 });
      return { valid: true, name, preview };
    } catch (err) {
      return { valid: false, error: `Failed to validate YouTube channel: ${(err as Error).message}` };
    }
  },

  async fetchItems(config) {
    const { channelId, limit } = parseConfig(config);
    if (!channelId) return [];

    // Try YouTube Data API v3 first if key is available
    if (env.YOUTUBE_API_KEY) {
      try {
        return await fetchViaApi(channelId, limit);
      } catch {
        // Fall through to RSS
      }
    }

    // RSS fallback
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    const feed = await rssParser.parseURL(feedUrl);
    const feedItems = (feed.items || []).slice(0, limit) as YTRssItem[];

    return feedItems.map((item): InspirationRawItem => {
      const videoId = item.ytVideoId || '';
      return {
        externalId: videoId,
        title: item.title || 'Untitled',
        body: item.contentSnippet ? stripHtml(item.contentSnippet).slice(0, 2000) : undefined,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        authorName: item.author || feed.title,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: item.isoDate || undefined,
        metadata: {
          channelId,
          channelTitle: feed.title,
          videoId,
        },
      };
    });
  },
};

async function fetchViaApi(channelId: string, limit: number): Promise<InspirationRawItem[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channelId)}&maxResults=${limit}&order=date&type=video&key=${env.YOUTUBE_API_KEY}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`YouTube API error: HTTP ${res.status}`);

  const json = await res.json() as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        channelTitle?: string;
        publishedAt?: string;
        thumbnails?: { high?: { url?: string } };
      };
    }>;
  };

  return (json.items || []).map((item): InspirationRawItem => {
    const videoId = item.id?.videoId || '';
    const snippet = item.snippet || {};
    return {
      externalId: videoId,
      title: snippet.title || 'Untitled',
      body: snippet.description ? snippet.description.slice(0, 2000) : undefined,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      authorName: snippet.channelTitle,
      thumbnailUrl: snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt: snippet.publishedAt || undefined,
      metadata: {
        channelId,
        channelTitle: snippet.channelTitle,
        videoId,
      },
    };
  });
}
