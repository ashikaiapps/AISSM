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

type RedditSort = 'hot' | 'top' | 'new' | 'rising';

interface RedditConfig {
  subreddit: string;
  sort?: RedditSort;
  limit?: number;
}

function parseConfig(config: Record<string, unknown>): RedditConfig {
  const subreddit = String(config.subreddit || '').replace(/^\/?(r\/)?/, '').trim();
  const sort = (['hot', 'top', 'new', 'rising'].includes(String(config.sort)) ? String(config.sort) : 'hot') as RedditSort;
  const maxItems = INSPIRATION_SOURCE_LIMITS.reddit.maxItemsPerFetch;
  const limit = Math.min(Number(config.limit) || 25, maxItems);
  return { subreddit, sort, limit };
}

const HEADERS = { 'User-Agent': 'SocialKeys.ai/1.0' };

export const redditAdapter: InspirationSourceAdapter = {
  type: 'reddit',
  displayName: 'Reddit',

  async validate(config) {
    const { subreddit } = parseConfig(config);
    if (!subreddit) return { valid: false, error: 'subreddit is required' };

    try {
      const res = await fetchWithTimeout(
        `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/about.json`,
        { headers: HEADERS },
      );
      if (!res.ok) return { valid: false, error: `Subreddit r/${subreddit} not found (HTTP ${res.status})` };

      const json = await res.json() as { data?: { display_name_prefixed?: string; title?: string } };
      const name = json.data?.display_name_prefixed || `r/${subreddit}`;

      // Grab a few preview items
      const preview = await this.fetchItems({ ...config, limit: 3 });
      return { valid: true, name, preview };
    } catch (err) {
      return { valid: false, error: `Failed to validate subreddit: ${(err as Error).message}` };
    }
  },

  async fetchItems(config) {
    const { subreddit, sort, limit } = parseConfig(config);
    if (!subreddit) return [];

    const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${sort}.json?limit=${limit}&raw_json=1`;
    const res = await fetchWithTimeout(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Reddit API error: HTTP ${res.status}`);

    const json = await res.json() as {
      data?: {
        children?: Array<{
          data: {
            id: string;
            title: string;
            selftext?: string;
            url: string;
            author: string;
            thumbnail?: string;
            score: number;
            num_comments: number;
            created_utc: number;
            permalink: string;
            subreddit: string;
            link_flair_text?: string;
            is_self?: boolean;
          };
        }>;
      };
    };

    const children = json.data?.children || [];
    const items: InspirationRawItem[] = [];

    for (const child of children) {
      const d = child.data;
      const thumb = d.thumbnail && !['self', 'default', 'nsfw', 'spoiler', ''].includes(d.thumbnail)
        ? d.thumbnail
        : undefined;

      items.push({
        externalId: d.id,
        title: d.title,
        body: d.selftext ? stripHtml(d.selftext).slice(0, 2000) : undefined,
        url: d.is_self ? `https://www.reddit.com${d.permalink}` : d.url,
        authorName: d.author,
        authorUrl: `https://www.reddit.com/user/${d.author}`,
        thumbnailUrl: thumb,
        score: d.score,
        commentCount: d.num_comments,
        publishedAt: new Date(d.created_utc * 1000).toISOString(),
        metadata: {
          subreddit: d.subreddit,
          flair: d.link_flair_text || null,
          permalink: `https://www.reddit.com${d.permalink}`,
          isSelf: d.is_self ?? false,
        },
      });
    }

    return items;
  },
};
