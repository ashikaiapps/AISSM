import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getAdapter } from '../adapters/base.js';
import { decrypt } from '../services/crypto.js';
import type { Platform, OAuthTokens, ConnectedAccount } from '@socialkeys/shared';

export const postRoutes = Router();

const DEFAULT_USER_ID = 'default-user';
const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');

// Create and publish a post
postRoutes.post('/', async (req, res) => {
  try {
    const { caption, accountIds, mediaIds } = req.body as {
      caption: string;
      accountIds: string[];
      mediaIds?: string[];
    };

    if (!caption || !accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'caption and accountIds[] are required' });
    }

    const postId = crypto.randomUUID();

    // Resolve media files from IDs
    const mediaFiles: Array<{ id: string; filePath: string; filename: string; mimeType: string; sizeBytes: number }> = [];
    if (mediaIds && mediaIds.length > 0) {
      const uploadFiles = fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : [];
      for (const mediaId of mediaIds) {
        const match = uploadFiles.find((f) => f.startsWith(mediaId));
        if (match) {
          const filePath = path.join(UPLOAD_DIR, match);
          const stat = fs.statSync(filePath);
          const ext = path.extname(match).toLowerCase();
          const mimeMap: Record<string, string> = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.mp4': 'video/mp4',
            '.mov': 'video/quicktime', '.webm': 'video/webm',
          };
          mediaFiles.push({
            id: mediaId,
            filePath,
            filename: match,
            mimeType: mimeMap[ext] || 'application/octet-stream',
            sizeBytes: stat.size,
          });
        }
      }
    }

    // Create the post record
    await db.insert(schema.posts).values({
      id: postId,
      userId: DEFAULT_USER_ID,
      caption,
      status: 'publishing',
    });

    // Store media references
    for (let i = 0; i < mediaFiles.length; i++) {
      const m = mediaFiles[i];
      await db.insert(schema.postMedia).values({
        id: crypto.randomUUID(),
        postId,
        filePath: m.filePath,
        originalFilename: m.filename,
        mimeType: m.mimeType,
        fileSizeBytes: m.sizeBytes,
        sortOrder: i,
      });
    }

    // Build mediaUrls for adapters (local file paths)
    const mediaUrls = mediaFiles.map((m) => m.filePath);

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
        const contentForValidation = mediaUrls.length > 0 ? { caption, mediaUrls } : { caption };
        const validation = adapter.validateContent(contentForValidation);
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

        // Publish (include media file paths)
        const content = mediaUrls.length > 0 ? { caption, mediaUrls } : { caption };
        const result = await adapter.publishPost(content, connectedAccount, tokens);

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
