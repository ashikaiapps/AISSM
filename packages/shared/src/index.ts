// Supported social platforms
export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  platformAccountId: string;
  accountName: string;
  handle?: string;
  avatarUrl?: string;
  accountType?: string; // 'page' | 'profile' | 'business' | 'creator' | 'channel'
  isActive: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scopes: string;
  expiresAt?: Date;
}

export interface PostContent {
  caption: string;
  mediaUrls?: string[];
  tags?: UserTag[];
  hashtags?: string[];
}

export interface UserTag {
  username: string;
  platformUserId?: string;
  x?: number; // for Instagram photo tags
  y?: number;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface PostAnalytics {
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
  reach?: number;
}

export const PLATFORM_LIMITS: Record<Platform, { maxCaptionLength: number; maxMediaCount: number; supportedMediaTypes: string[] }> = {
  linkedin: { maxCaptionLength: 3000, maxMediaCount: 20, supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'] },
  facebook: { maxCaptionLength: 63206, maxMediaCount: 10, supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'] },
  instagram: { maxCaptionLength: 2200, maxMediaCount: 10, supportedMediaTypes: ['image/jpeg', 'video/mp4'] },
  youtube: { maxCaptionLength: 5000, maxMediaCount: 1, supportedMediaTypes: ['video/mp4', 'video/quicktime'] },
  tiktok: { maxCaptionLength: 2200, maxMediaCount: 1, supportedMediaTypes: ['video/mp4', 'video/quicktime'] },
};

// ─── Inspiration Feed Types ────────────────────────────────────────

export type InspirationSourceType = 'reddit' | 'hackernews' | 'rss' | 'youtube' | 'producthunt';

export type InspirationItemStatus = 'unread' | 'read' | 'saved' | 'used' | 'dismissed';

export interface InspirationSource {
  id: string;
  type: InspirationSourceType;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastFetchedAt: string | null;
  fetchIntervalMinutes: number;
  errorCount: number;
  lastError: string | null;
  createdAt: string;
}

export interface InspirationItem {
  id: string;
  sourceId: string;
  type: InspirationSourceType;
  externalId: string;
  title: string;
  body?: string;
  url: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  score?: number;
  commentCount?: number;
  publishedAt?: string;
  metadata: Record<string, unknown>;
  status: InspirationItemStatus;
  isSaved: boolean;
  notes?: string;
  draftPostId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspirationItemWithSource extends InspirationItem {
  sourceName: string;
}

export interface FeedStats {
  totalItems: number;
  unreadCount: number;
  savedCount: number;
  usedCount: number;
  bySource: Array<{ sourceId: string; sourceName: string; type: InspirationSourceType; count: number }>;
  todayCount: number;
}

export const INSPIRATION_SOURCE_LIMITS: Record<InspirationSourceType, {
  maxSources: number;
  minFetchIntervalMinutes: number;
  defaultFetchIntervalMinutes: number;
  maxItemsPerFetch: number;
}> = {
  reddit:      { maxSources: 10, minFetchIntervalMinutes: 15, defaultFetchIntervalMinutes: 30, maxItemsPerFetch: 50 },
  hackernews:  { maxSources: 3,  minFetchIntervalMinutes: 15, defaultFetchIntervalMinutes: 30, maxItemsPerFetch: 30 },
  rss:         { maxSources: 20, minFetchIntervalMinutes: 15, defaultFetchIntervalMinutes: 60, maxItemsPerFetch: 30 },
  youtube:     { maxSources: 10, minFetchIntervalMinutes: 60, defaultFetchIntervalMinutes: 120, maxItemsPerFetch: 15 },
  producthunt: { maxSources: 5,  minFetchIntervalMinutes: 60, defaultFetchIntervalMinutes: 360, maxItemsPerFetch: 20 },
};

export const INSPIRATION_SOURCE_ICONS: Record<InspirationSourceType, string> = {
  reddit: '🔴',
  hackernews: '🟠',
  rss: '🟡',
  youtube: '🔵',
  producthunt: '🟤',
};
