import { Router } from 'express';
import crypto from 'crypto';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getAdapter } from '../adapters/base.js';
import { decrypt } from '../services/crypto.js';
import type { Platform, OAuthTokens, ConnectedAccount } from '@socialkeys/shared';

export const postRoutes = Router();

const DEFAULT_USER_ID = 'default-user';

// Create and publish a post
postRoutes.post('/', async (req, res) => {
  try {
    const { caption, accountIds } = req.body as { caption: string; accountIds: string[] };

    if (!caption || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'caption and accountIds[] are required' });
    }

    const postId = crypto.randomUUID();

    // Create the post record
    await db.insert(schema.posts).values({
      id: postId,
      userId: DEFAULT_USER_ID,
      caption,
      status: 'publishing',
    });

    const results: Array<{ accountId: string; platform: string; success: boolean; error?: string; platformPostId?: string }> = [];

    for (const accountId of accountIds) {
      const postAccountId = crypto.randomUUID();

      try {
        // Look up the social account
        const [account] = await db
          .select()
          .from(schema.socialAccounts)
          .where(eq(schema.socialAccounts.id, accountId))
          .limit(1);

        if (!account) {
          results.push({ accountId, platform: 'unknown', success: false, error: 'Account not found' });
          continue;
        }

        // Look up the OAuth tokens
        const [tokenRow] = await db
          .select()
          .from(schema.oauthTokens)
          .where(eq(schema.oauthTokens.socialAccountId, accountId))
          .limit(1);

        if (!tokenRow) {
          results.push({ accountId, platform: account.platform, success: false, error: 'No tokens found' });
          continue;
        }

        // Decrypt tokens
        const tokens: OAuthTokens = {
          accessToken: decrypt(tokenRow.accessTokenEncrypted),
          refreshToken: tokenRow.refreshTokenEncrypted ? decrypt(tokenRow.refreshTokenEncrypted) : undefined,
          tokenType: tokenRow.tokenType,
          scopes: tokenRow.scopes,
          expiresAt: tokenRow.expiresAt ? new Date(tokenRow.expiresAt) : undefined,
        };

        const connectedAccount: ConnectedAccount = {
          id: account.id,
          platform: account.platform as Platform,
          platformAccountId: account.platformAccountId,
          accountName: account.accountName,
          handle: account.handle ?? undefined,
          avatarUrl: account.avatarUrl ?? undefined,
          accountType: account.accountType ?? undefined,
          isActive: account.isActive,
        };

        const adapter = getAdapter(account.platform as Platform);

        // Validate content
        const validation = adapter.validateContent({ caption });
        if (!validation.valid) {
          await db.insert(schema.postAccounts).values({
            id: postAccountId,
            postId,
            socialAccountId: accountId,
            status: 'failed',
            error: validation.errors.join('; '),
          });
          results.push({ accountId, platform: account.platform, success: false, error: validation.errors.join('; ') });
          continue;
        }

        // Publish
        const result = await adapter.publishPost({ caption }, connectedAccount, tokens);

        await db.insert(schema.postAccounts).values({
          id: postAccountId,
          postId,
          socialAccountId: accountId,
          status: result.success ? 'published' : 'failed',
          platformPostId: result.platformPostId ?? null,
          publishedUrl: result.publishedUrl ?? null,
          error: result.error ?? null,
          publishedAt: result.success ? new Date().toISOString() : null,
        });

        results.push({
          accountId,
          platform: account.platform,
          success: result.success,
          platformPostId: result.platformPostId,
          error: result.error,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await db.insert(schema.postAccounts).values({
          id: postAccountId,
          postId,
          socialAccountId: accountId,
          status: 'failed',
          error: message,
        });
        results.push({ accountId, platform: 'unknown', success: false, error: message });
      }
    }

    // Update overall post status
    const allSucceeded = results.every((r) => r.success);
    const allFailed = results.every((r) => !r.success);
    const postStatus = allSucceeded ? 'published' : allFailed ? 'failed' : 'published';

    await db
      .update(schema.posts)
      .set({ status: postStatus, updatedAt: new Date().toISOString() })
      .where(eq(schema.posts.id, postId));

    res.status(201).json({ postId, status: postStatus, results });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// List recent posts for the current user
postRoutes.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.userId, DEFAULT_USER_ID))
      .orderBy(desc(schema.posts.createdAt))
      .limit(50);

    const postsWithAccounts = await Promise.all(
      rows.map(async (post) => {
        const accountStatuses = await db
          .select()
          .from(schema.postAccounts)
          .where(eq(schema.postAccounts.postId, post.id));

        return {
          ...post,
          accounts: accountStatuses.map((pa) => ({
            socialAccountId: pa.socialAccountId,
            status: pa.status,
            platformPostId: pa.platformPostId,
            publishedUrl: pa.publishedUrl,
            error: pa.error,
            publishedAt: pa.publishedAt,
          })),
        };
      }),
    );

    res.json({ posts: postsWithAccounts });
  } catch (err) {
    console.error('Error listing posts:', err);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// Get a single post with its per-account statuses
postRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, id))
      .limit(1);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const accountStatuses = await db
      .select()
      .from(schema.postAccounts)
      .where(eq(schema.postAccounts.postId, id));

    res.json({
      ...post,
      accounts: accountStatuses.map((pa) => ({
        socialAccountId: pa.socialAccountId,
        status: pa.status,
        platformPostId: pa.platformPostId,
        publishedUrl: pa.publishedUrl,
        error: pa.error,
        publishedAt: pa.publishedAt,
      })),
    });
  } catch (err) {
    console.error('Error fetching post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});
