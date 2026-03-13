import type { Platform, ConnectedAccount, OAuthTokens } from '@socialkeys/shared';

export interface TempAuthData {
  platform: Platform;
  tokens: OAuthTokens;
  discoveredAccounts: ConnectedAccount[];
  /** Facebook page-level access tokens keyed by platformAccountId */
  pageTokens?: Record<string, string>;
  createdAt: number;
}

const store = new Map<string, TempAuthData>();

const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/** Remove entries older than 10 minutes. */
function cleanup() {
  const cutoff = Date.now() - EXPIRY_MS;
  for (const [key, value] of store) {
    if (value.createdAt < cutoff) store.delete(key);
  }
}

export function setTempAuth(id: string, data: TempAuthData): void {
  cleanup();
  store.set(id, data);
}

export function getTempAuth(id: string): TempAuthData | undefined {
  cleanup();
  return store.get(id);
}

export function deleteTempAuth(id: string): void {
  store.delete(id);
}
