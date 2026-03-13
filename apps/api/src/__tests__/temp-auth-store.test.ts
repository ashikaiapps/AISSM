import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setTempAuth, getTempAuth, deleteTempAuth } from '../services/temp-auth-store.js';
import type { OAuthTokens } from '@socialkeys/shared';

const mockTokens: OAuthTokens = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  tokenType: 'Bearer',
  scopes: 'read write',
  expiresAt: new Date(Date.now() + 3600000),
};

describe('temp-auth-store', () => {
  beforeEach(() => {
    // Clean slate — delete known test keys
    deleteTempAuth('test-1');
    deleteTempAuth('test-2');
    deleteTempAuth('test-expired');
  });

  it('stores and retrieves temp auth data', () => {
    setTempAuth('test-1', {
      platform: 'facebook',
      tokens: mockTokens,
      discoveredAccounts: [],
      createdAt: Date.now(),
    });

    const result = getTempAuth('test-1');
    expect(result).toBeDefined();
    expect(result!.platform).toBe('facebook');
    expect(result!.tokens.accessToken).toBe('test-access-token');
  });

  it('returns undefined for missing key', () => {
    expect(getTempAuth('nonexistent')).toBeUndefined();
  });

  it('deletes temp auth data', () => {
    setTempAuth('test-2', {
      platform: 'instagram',
      tokens: mockTokens,
      discoveredAccounts: [],
      createdAt: Date.now(),
    });

    expect(getTempAuth('test-2')).toBeDefined();
    deleteTempAuth('test-2');
    expect(getTempAuth('test-2')).toBeUndefined();
  });

  it('expires entries older than 10 minutes', () => {
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;

    setTempAuth('test-expired', {
      platform: 'facebook',
      tokens: mockTokens,
      discoveredAccounts: [],
      createdAt: elevenMinutesAgo,
    });

    // Trigger cleanup by calling get
    expect(getTempAuth('test-expired')).toBeUndefined();
  });

  it('keeps entries younger than 10 minutes', () => {
    setTempAuth('test-1', {
      platform: 'facebook',
      tokens: mockTokens,
      discoveredAccounts: [],
      createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    });

    expect(getTempAuth('test-1')).toBeDefined();
  });

  it('stores pageTokens for Facebook', () => {
    setTempAuth('test-1', {
      platform: 'facebook',
      tokens: mockTokens,
      discoveredAccounts: [],
      pageTokens: { 'page-123': 'page-token-abc' },
      createdAt: Date.now(),
    });

    const result = getTempAuth('test-1');
    expect(result!.pageTokens).toEqual({ 'page-123': 'page-token-abc' });
  });
});
