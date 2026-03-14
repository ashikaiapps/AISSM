import type { InspirationSourceType } from '@socialkeys/shared';

export interface InspirationRawItem {
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
  metadata?: Record<string, unknown>;
}

export interface InspirationSourceAdapter {
  readonly type: InspirationSourceType;
  readonly displayName: string;
  validate(config: Record<string, unknown>): Promise<{ valid: boolean; name?: string; error?: string; preview?: InspirationRawItem[] }>;
  fetchItems(config: Record<string, unknown>): Promise<InspirationRawItem[]>;
}

const adapters = new Map<InspirationSourceType, InspirationSourceAdapter>();

export function registerInspirationAdapter(adapter: InspirationSourceAdapter): void {
  adapters.set(adapter.type, adapter);
}

export function getInspirationAdapter(type: InspirationSourceType): InspirationSourceAdapter {
  const adapter = adapters.get(type);
  if (!adapter) throw new Error(`No inspiration adapter for type: ${type}`);
  return adapter;
}

export function getAllInspirationAdapters(): InspirationSourceAdapter[] {
  return Array.from(adapters.values());
}
