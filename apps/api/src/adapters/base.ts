import type { Platform, PostContent, PublishResult, ConnectedAccount, OAuthTokens, PostAnalytics } from '@socialkeys/shared';

export interface PlatformAdapter {
  readonly platform: Platform;
  readonly displayName: string;

  // OAuth
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<{ account: ConnectedAccount; tokens: OAuthTokens }>;
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  // Account discovery (e.g., multiple IG accounts under one FB login)
  listAvailableAccounts?(tokens: OAuthTokens): Promise<ConnectedAccount[]>;

  // Publishing
  publishPost(content: PostContent, account: ConnectedAccount, tokens: OAuthTokens): Promise<PublishResult>;
  deletePost?(platformPostId: string, tokens: OAuthTokens): Promise<void>;
  getPostStatus?(platformPostId: string, tokens: OAuthTokens): Promise<string>;

  // Analytics
  getPostAnalytics?(platformPostId: string, tokens: OAuthTokens): Promise<PostAnalytics>;

  // Validation
  validateContent(content: PostContent): { valid: boolean; errors: string[] };
}

// Adapter registry
const adapters = new Map<Platform, PlatformAdapter>();

export function registerAdapter(adapter: PlatformAdapter): void {
  adapters.set(adapter.platform, adapter);
}

export function getAdapter(platform: Platform): PlatformAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) throw new Error(`No adapter registered for platform: ${platform}`);
  return adapter;
}

export function getAllAdapters(): PlatformAdapter[] {
  return Array.from(adapters.values());
}
