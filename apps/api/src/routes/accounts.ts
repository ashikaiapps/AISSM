import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ConnectedAccount } from '@socialkeys/shared';

export const accountRoutes = Router();

const DEFAULT_USER_ID = 'default-user';

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
