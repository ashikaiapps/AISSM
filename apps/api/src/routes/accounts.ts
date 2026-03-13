import { Router } from 'express';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ConnectedAccount } from '@socialkeys/shared';
import { getAdapter } from '../adapters/base.js';
import { encrypt } from '../services/crypto.js';
import { getTempAuth, deleteTempAuth, type TempAuthData } from '../services/temp-auth-store.js';
import { env } from '../config/env.js';

export const accountRoutes = Router();

const DEFAULT_USER_ID = 'default-user';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Persist an array of discovered accounts + their OAuth tokens to the DB. */
async function storeAccounts(
  accounts: ConnectedAccount[],
  tempData: TempAuthData,
): Promise<ConnectedAccount[]> {
  const connected: ConnectedAccount[] = [];

  for (const account of accounts) {
    const accountId = crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    // Facebook Pages get a per-page token; everything else uses the user token
    let accessToken: string;
    let refreshToken: string | undefined;

    if (tempData.platform === 'facebook' && tempData.pageTokens?.[account.platformAccountId]) {
      accessToken = tempData.pageTokens[account.platformAccountId];
      refreshToken = tempData.tokens.refreshToken || tempData.tokens.accessToken;
    } else {
      accessToken = tempData.tokens.accessToken;
      refreshToken = tempData.tokens.refreshToken;
    }

    await db.insert(schema.socialAccounts).values({
      id: accountId,
      userId: DEFAULT_USER_ID,
      platform: account.platform,
      platformAccountId: account.platformAccountId,
      accountName: account.accountName,
      handle: account.handle ?? null,
      accountType: account.accountType ?? null,
      avatarUrl: account.avatarUrl ?? null,
      isActive: true,
      metadata: '{}',
    });

    await db.insert(schema.oauthTokens).values({
      id: tokenId,
      socialAccountId: accountId,
      accessTokenEncrypted: encrypt(accessToken),
      refreshTokenEncrypted: refreshToken ? encrypt(refreshToken) : null,
      tokenType: tempData.tokens.tokenType,
      scopes: tempData.tokens.scopes,
      expiresAt: tempData.tokens.expiresAt ? tempData.tokens.expiresAt.toISOString() : null,
    });

    connected.push({ ...account, id: accountId });
  }

  return connected;
}

// ---------------------------------------------------------------------------
// Existing routes
// ---------------------------------------------------------------------------

// List all connected accounts for the current user
accountRoutes.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.socialAccounts)
      .where(eq(schema.socialAccounts.userId, DEFAULT_USER_ID));

    const accounts: ConnectedAccount[] = rows.map((row) => ({
      id: row.id,
      platform: row.platform as ConnectedAccount['platform'],
      platformAccountId: row.platformAccountId,
      accountName: row.accountName,
      handle: row.handle ?? undefined,
      avatarUrl: row.avatarUrl ?? undefined,
      accountType: row.accountType ?? undefined,
      isActive: row.isActive,
    }));

    res.json({ accounts });
  } catch (err) {
    console.error('Error listing accounts:', err);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// Disconnect an account (cascade deletes oauth_tokens)
accountRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated tokens first, then the account
    await db.delete(schema.oauthTokens).where(eq(schema.oauthTokens.socialAccountId, id));
    await db.delete(schema.socialAccounts).where(eq(schema.socialAccounts.id, id));

    res.status(204).send();
  } catch (err) {
    console.error('Error disconnecting account:', err);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// ---------------------------------------------------------------------------
// Account discovery & batch-connect
// ---------------------------------------------------------------------------

// Discover available accounts for a pending OAuth session
accountRoutes.get('/discover/:tempId', async (req, res) => {
  try {
    const { tempId } = req.params;
    const tempData = getTempAuth(tempId);

    if (!tempData) {
      return res.status(404).json({
        error: 'Session expired or not found. Please start the connection flow again.',
      });
    }

    // Return cached results if already discovered
    if (tempData.discoveredAccounts.length > 0) {
      return res.json({
        platform: tempData.platform,
        accounts: tempData.discoveredAccounts,
        tempId,
      });
    }

    const adapter = getAdapter(tempData.platform);
    if (!adapter.listAvailableAccounts) {
      return res.status(400).json({
        error: `Platform ${tempData.platform} does not support account discovery`,
      });
    }

    const accounts = await adapter.listAvailableAccounts(tempData.tokens);

    // For Facebook, also fetch per-page access tokens
    if (tempData.platform === 'facebook') {
      const userToken = tempData.tokens.refreshToken || tempData.tokens.accessToken;
      const resp = await fetch(
        `https://graph.facebook.com/${env.META_GRAPH_VERSION}/me/accounts?fields=id,access_token`,
        { headers: { Authorization: `Bearer ${userToken}` } },
      );
      if (resp.ok) {
        const data = (await resp.json()) as {
          data: Array<{ id: string; access_token: string }>;
        };
        const pageTokens: Record<string, string> = {};
        for (const page of data.data || []) {
          pageTokens[page.id] = page.access_token;
        }
        tempData.pageTokens = pageTokens;
      }
    }

    // Cache discovered accounts in the temp store
    tempData.discoveredAccounts = accounts;

    res.json({ platform: tempData.platform, accounts, tempId });
  } catch (err) {
    console.error('Account discovery error:', err);
    const message = err instanceof Error ? err.message : 'Failed to discover accounts';
    res.status(500).json({ error: message });
  }
});

// Connect user-selected accounts from a discovery session
accountRoutes.post('/connect-selected', async (req, res) => {
  try {
    const { tempId, selectedAccountIds } = req.body as {
      tempId: string;
      selectedAccountIds: string[];
    };

    if (!tempId || !selectedAccountIds?.length) {
      return res.status(400).json({ error: 'tempId and selectedAccountIds are required' });
    }

    const tempData = getTempAuth(tempId);
    if (!tempData) {
      return res.status(404).json({
        error: 'Session expired or not found. Please start the connection flow again.',
      });
    }

    if (tempData.discoveredAccounts.length === 0) {
      return res.status(400).json({
        error: 'No accounts discovered yet. Call /discover/:tempId first.',
      });
    }

    const selectedAccounts = tempData.discoveredAccounts.filter((a) =>
      selectedAccountIds.includes(a.platformAccountId),
    );

    if (selectedAccounts.length === 0) {
      return res.status(400).json({
        error: 'None of the selected account IDs match discovered accounts',
      });
    }

    const connected = await storeAccounts(selectedAccounts, tempData);
    deleteTempAuth(tempId);

    res.json({ connected });
  } catch (err) {
    console.error('Connect selected error:', err);
    const message = err instanceof Error ? err.message : 'Failed to connect accounts';
    res.status(500).json({ error: message });
  }
});

// Connect ALL discovered accounts from a discovery session
accountRoutes.post('/connect-all', async (req, res) => {
  try {
    const { tempId } = req.body as { tempId: string };

    if (!tempId) {
      return res.status(400).json({ error: 'tempId is required' });
    }

    const tempData = getTempAuth(tempId);
    if (!tempData) {
      return res.status(404).json({
        error: 'Session expired or not found. Please start the connection flow again.',
      });
    }

    if (tempData.discoveredAccounts.length === 0) {
      return res.status(400).json({
        error: 'No accounts discovered yet. Call /discover/:tempId first.',
      });
    }

    const connected = await storeAccounts(tempData.discoveredAccounts, tempData);
    deleteTempAuth(tempId);

    res.json({ connected });
  } catch (err) {
    console.error('Connect all error:', err);
    const message = err instanceof Error ? err.message : 'Failed to connect accounts';
    res.status(500).json({ error: message });
  }
});
