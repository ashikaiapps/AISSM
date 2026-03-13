import type { PlatformAdapter } from './base.js';
import type { ConnectedAccount, OAuthTokens, PostContent, PublishResult } from '@socialkeys/shared';
import { env } from '../config/env.js';
import crypto from 'crypto';

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
const AUTHORIZE_URL = `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `${GRAPH_BASE}/oauth/access_token`;
const SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';

const MAX_CAPTION_LENGTH = 2200;
const MAX_HASHTAGS = 30;
const MAX_USER_TAGS = 20;

// Delay helper for polling container status
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Instagram API error (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Exchange a short-lived user token for a long-lived one (~60 days).
 */
async function exchangeForLongLivedToken(shortToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  return graphGet(`${TOKEN_URL}?${params.toString()}`, shortToken);
}

interface IGPageAccount {
  id: string;
  name: string;
  instagram_business_account?: {
    id: string;
    username: string;
    profile_picture_url?: string;
    name: string;
  };
}

/**
 * Discover Instagram Business/Creator accounts linked to the user's Facebook Pages.
 */
async function discoverInstagramAccounts(
  userToken: string,
): Promise<Array<{ igAccount: IGPageAccount['instagram_business_account'] & {}; pageId: string }>> {
  const data = await graphGet<{ data: IGPageAccount[] }>(
    `${GRAPH_BASE}/me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url,name}`,
    userToken,
  );

  const results: Array<{ igAccount: IGPageAccount['instagram_business_account'] & {}; pageId: string }> = [];
  for (const page of data.data || []) {
    if (page.instagram_business_account) {
      results.push({ igAccount: page.instagram_business_account, pageId: page.id });
    }
  }
  return results;
}

/**
 * Detect whether a media URL points to a video (Reels) based on its extension.
 */
function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase().split('?')[0];
  return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.avi');
}

/**
 * Poll the container status until it is FINISHED or an error occurs.
 * Instagram containers transition through IN_PROGRESS → FINISHED.
 */
async function waitForContainer(
  containerId: string,
  token: string,
  maxAttempts = 10,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await graphGet<{ status_code: string }>(
      `${GRAPH_BASE}/${containerId}?fields=status_code`,
      token,
    );
    if (status.status_code === 'FINISHED') return 'FINISHED';
    if (status.status_code === 'ERROR') return 'ERROR';
    await delay(3000);
  }
  return 'TIMEOUT';
}

export const instagramAdapter: PlatformAdapter = {
  platform: 'instagram',
  displayName: 'Instagram',

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: env.META_INSTAGRAM_REDIRECT_URI,
      state,
      scope: SCOPES,
      response_type: 'code',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<{ account: ConnectedAccount; tokens: OAuthTokens }> {
    // 1. Exchange authorization code for a short-lived user token
    const tokenParams = new URLSearchParams({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri: env.META_INSTAGRAM_REDIRECT_URI,
      code,
    });

    const shortTokenData = await graphGet<{
      access_token: string;
      token_type: string;
      expires_in?: number;
    }>(`${TOKEN_URL}?${tokenParams.toString()}`, '');

    // 2. Exchange for a long-lived user token (~60 days)
    const longTokenData = await exchangeForLongLivedToken(shortTokenData.access_token);

    // 3. Discover Instagram Business accounts linked to the user's Pages
    const igAccounts = await discoverInstagramAccounts(longTokenData.access_token);

    if (igAccounts.length === 0) {
      throw new Error(
        'No Instagram Business or Creator account found. ' +
        'Ensure a Facebook Page is linked to an Instagram Professional account.',
      );
    }

    // 4. Return the first IG account found
    const { igAccount } = igAccounts[0];
    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      platform: 'instagram',
      platformAccountId: igAccount.id,
      accountName: igAccount.name,
      handle: igAccount.username,
      avatarUrl: igAccount.profile_picture_url,
      accountType: 'business',
      isActive: true,
    };

    const tokens: OAuthTokens = {
      accessToken: longTokenData.access_token,
      refreshToken: longTokenData.access_token,
      tokenType: longTokenData.token_type || 'Bearer',
      scopes: SCOPES,
      expiresAt: new Date(Date.now() + longTokenData.expires_in * 1000),
    };

    return { account, tokens };
  },

  async listAvailableAccounts(tokens: OAuthTokens): Promise<ConnectedAccount[]> {
    const userToken = tokens.refreshToken || tokens.accessToken;
    const igAccounts = await discoverInstagramAccounts(userToken);

    return igAccounts.map(({ igAccount }) => ({
      id: crypto.randomUUID(),
      platform: 'instagram' as const,
      platformAccountId: igAccount.id,
      accountName: igAccount.name,
      handle: igAccount.username,
      avatarUrl: igAccount.profile_picture_url,
      accountType: 'business',
      isActive: true,
    }));
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    // Meta long-lived tokens auto-refresh on use; no refresh grant exists.
    // Return the existing token — the user must re-authorize if truly expired.
    return {
      accessToken: refreshToken,
      refreshToken,
      tokenType: 'Bearer',
      scopes: SCOPES,
    };
  },

  async publishPost(
    content: PostContent,
    account: ConnectedAccount,
    tokens: OAuthTokens,
  ): Promise<PublishResult> {
    const igAccountId = account.platformAccountId;

    if (!content.mediaUrls?.length) {
      return {
        success: false,
        error: 'Instagram requires at least one media URL (image or video). Text-only posts are not supported.',
        errorCode: 'MISSING_MEDIA',
      };
    }

    const mediaUrl = content.mediaUrls[0];

    // Build caption with hashtags
    let caption = content.caption || '';
    if (content.hashtags?.length) {
      const tagString = content.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
      caption = caption ? `${caption}\n\n${tagString}` : tagString;
    }

    // Step 1: Create media container
    const isVideo = isVideoUrl(mediaUrl);
    const containerBody: Record<string, unknown> = {
      caption,
      access_token: tokens.accessToken,
    };

    if (isVideo) {
      containerBody.video_url = mediaUrl;
      containerBody.media_type = 'REELS';
    } else {
      containerBody.image_url = mediaUrl;

      // Add user tags for photo posts only
      if (content.tags?.length) {
        const userTags = content.tags.slice(0, MAX_USER_TAGS).map((tag) => ({
          username: tag.username,
          x: tag.x ?? 0.5,
          y: tag.y ?? 0.5,
        }));
        containerBody.user_tags = JSON.stringify(userTags);
      }
    }

    const containerRes = await fetch(`${GRAPH_BASE}/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerBody),
    });

    if (!containerRes.ok) {
      const errText = await containerRes.text();
      const hint = errText.includes('URL is not reachable')
        ? ' — Instagram requires publicly accessible media URLs. For local development, use a tunnel (e.g., ngrok) or host media on a public server.'
        : '';
      return {
        success: false,
        error: `Instagram container creation failed (${containerRes.status}): ${errText}${hint}`,
        errorCode: String(containerRes.status),
      };
    }

    const containerData = (await containerRes.json()) as { id: string };
    const containerId = containerData.id;

    // Step 2: Wait for container processing (especially important for video)
    const containerStatus = await waitForContainer(containerId, tokens.accessToken);
    if (containerStatus === 'ERROR') {
      return {
        success: false,
        error: 'Instagram media container processing failed. Ensure the media URL is publicly accessible and in a supported format.',
        errorCode: 'CONTAINER_ERROR',
      };
    }
    if (containerStatus === 'TIMEOUT') {
      return {
        success: false,
        error: 'Instagram media container processing timed out. This can happen with large video files — try again shortly.',
        errorCode: 'CONTAINER_TIMEOUT',
      };
    }

    // Step 3: Publish the container
    const publishRes = await fetch(`${GRAPH_BASE}/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: tokens.accessToken,
      }),
    });

    if (!publishRes.ok) {
      const errText = await publishRes.text();
      return {
        success: false,
        error: `Instagram publish failed (${publishRes.status}): ${errText}`,
        errorCode: String(publishRes.status),
      };
    }

    const publishData = (await publishRes.json()) as { id: string };
    return {
      success: true,
      platformPostId: publishData.id,
      publishedUrl: `https://www.instagram.com/p/${publishData.id}/`,
    };
  },

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.mediaUrls?.length) {
      errors.push('Instagram requires at least one media URL — text-only posts are not supported');
    }

    if (content.caption && content.caption.length > MAX_CAPTION_LENGTH) {
      errors.push(
        `Caption exceeds Instagram's ${MAX_CAPTION_LENGTH}-character limit (${content.caption.length} chars)`,
      );
    }

    if (content.hashtags && content.hashtags.length > MAX_HASHTAGS) {
      errors.push(
        `Too many hashtags: Instagram allows a maximum of ${MAX_HASHTAGS} (got ${content.hashtags.length})`,
      );
    }

    if (content.tags && content.tags.length > MAX_USER_TAGS) {
      errors.push(
        `Too many user tags: Instagram allows a maximum of ${MAX_USER_TAGS} (got ${content.tags.length})`,
      );
    }

    return { valid: errors.length === 0, errors };
  },
};
