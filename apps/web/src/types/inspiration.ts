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

export interface InspirationSourceWithCount extends InspirationSource {
  itemCount: number;
}

export interface InspirationItemWithSource extends InspirationItem {
  sourceName: string;
}

export interface FeedPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FeedStats {
  totalItems: number;
  unreadCount: number;
  savedCount: number;
  usedCount: number;
  bySource: Array<{ sourceId: string; sourceName: string; count: number }>;
  todayCount: number;
}

export interface FeedFilters {
  page: number;
  limit: number;
  type?: InspirationSourceType;
  status?: InspirationItemStatus;
  search?: string;
  sortBy?: 'createdAt' | 'publishedAt' | 'score';
  sortOrder?: 'asc' | 'desc';
}
