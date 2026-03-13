import { Router } from 'express';
import crypto from 'crypto';
import type { Platform } from '@socialkeys/shared';
import { getAdapter } from '../adapters/base.js';
import { encrypt } from '../services/crypto.js';
import { db, schema } from '../db/index.js';
import { env } from '../config/env.js';

export const authRoutes = Router();

// In-memory state store for CSRF protection
const pendingStates = new Map<string, { platform: string; createdAt: number }>();

// Clean up expired states (older than 10 minutes)
function cleanupStates() {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of pendingStates) {
    if (value.createdAt < tenMinutesAgo) pendingStates.delete(key);
  }
}

// OAuth start — redirects user to platform's auth page
authRoutes.get('/:platform/start', (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const adapter = getAdapter(platform);

    cleanupStates();
    const state = crypto.randomUUID();
    pendingStates.set(state, { platform, createdAt: Date.now() });

    const authUrl = adapter.getAuthUrl(state);
    res.redirect(authUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// OAuth callback — handles redirect from platform
authRoutes.get('/callback/:platform', async (req, res) => {
  try {
    const platform = req.params.platform as Platform;
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;

    if (error) {
      return res.redirect(`${env.APP_URL}/accounts?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Validate state token
    const pending = pendingStates.get(state);
    if (!pending || pending.platform !== platform) {
      return res.status(400).json({ error: 'Invalid or expired state token' });
    }
    pendingStates.delete(state);

    const adapter = getAdapter(platform);
    const { account, tokens } = await adapter.exchangeCode(code);

    const userId = 'default-user';
    const accountId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    // Store social account
    await db.insert(schema.socialAccounts).values({
      id: accountId,
      userId,
      platform: account.platform,
      platformAccountId: account.platformAccountId,
      accountName: account.accountName,
      handle: account.handle ?? null,
      accountType: account.accountType ?? null,
      avatarUrl: account.avatarUrl ?? null,
      isActive: true,
      metadata: '{}',
    });

    // Store encrypted OAuth tokens
    await db.insert(schema.oauthTokens).values({
      id: tokenId,
      socialAccountId: accountId,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      tokenType: tokens.tokenType,
      scopes: tokens.scopes,
      expiresAt: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
    });

    res.redirect(`${env.APP_URL}/accounts?connected=${platform}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
