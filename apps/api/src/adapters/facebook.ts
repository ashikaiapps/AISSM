import type { PlatformAdapter } from './base.js';
import type { ConnectedAccount, OAuthTokens, PostContent, PublishResult } from '@socialkeys/shared';
import { env } from '../config/env.js';
import crypto from 'crypto';

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
const AUTHORIZE_URL = `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`;
const TOKEN_URL = `${GRAPH_BASE}/oauth/access_token`;
const SCOPES = 'pages_manage_posts,pages_read_engagement,pages_show_list';
const MAX_CAPTION_LENGTH = 63206;

async function graphGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Facebook API error (${res.status}): ${err}`);
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

/**
 * Fetch the first Facebook Page managed by the user and return its
 * page-level access token. Falls back to user account if no pages exist.
 */
async function fetchFirstPage(userToken: string): Promise<{
  account: ConnectedAccount;
  pageAccessToken: string;
} | null> {
  const data = await graphGet<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
      picture?: { data?: { url?: string } };
    }>;
  }>(`${GRAPH_BASE}/me/accounts?fields=id,name,access_token,picture`, userToken);

  if (!data.data || data.data.length === 0) return null;

  const page = data.data[0];
  return {
    account: {
      id: crypto.randomUUID(),
      platform: 'facebook',
      platformAccountId: page.id,
      accountName: page.name,
      avatarUrl: page.picture?.data?.url,
      accountType: 'page',
      isActive: true,
    },
    pageAccessToken: page.access_token,
  };
}

export const facebookAdapter: PlatformAdapter = {
  platform: 'facebook',
  displayName: 'Facebook',

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: env.META_APP_ID,
      redirect_uri: env.META_REDIRECT_URI,
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
      redirect_uri: env.META_REDIRECT_URI,
      code,
    });

    const shortTokenData = await graphGet<{
      access_token: string;
      token_type: string;
      expires_in?: number;
    }>(`${TOKEN_URL}?${tokenParams.toString()}`, '');

    // 2. Exchange for a long-lived user token (~60 days)
    const longTokenData = await exchangeForLongLivedToken(shortTokenData.access_token);

    // 3. Try to auto-connect the first managed Page
    const pageResult = await fetchFirstPage(longTokenData.access_token);

    if (pageResult) {
      // Store the PAGE token so publishPost can use it directly
      const tokens: OAuthTokens = {
        accessToken: pageResult.pageAccessToken,
        refreshToken: longTokenData.access_token, // keep user token for refreshing page list
        tokenType: longTokenData.token_type || 'Bearer',
        scopes: SCOPES,
        expiresAt: new Date(Date.now() + longTokenData.expires_in * 1000),
      };
      return { account: pageResult.account, tokens };
    }

    // No pages — fall back to user profile (posting will fail; user needs a Page)
    const profile = await graphGet<{
      id: string;
      name: string;
      picture?: { data?: { url?: string } };
    }>(`${GRAPH_BASE}/me?fields=id,name,picture`, longTokenData.access_token);

    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      platform: 'facebook',
      platformAccountId: profile.id,
      accountName: profile.name,
      avatarUrl: profile.picture?.data?.url,
      accountType: 'user',
      isActive: true,
    };

    const tokens: OAuthTokens = {
      accessToken: longTokenData.access_token,
      tokenType: longTokenData.token_type || 'Bearer',
      scopes: SCOPES,
      expiresAt: new Date(Date.now() + longTokenData.expires_in * 1000),
    };

    return { account, tokens };
  },

  async listAvailableAccounts(tokens: OAuthTokens): Promise<ConnectedAccount[]> {
    // Use the stored user token (refreshToken) to discover all managed Pages
    const userToken = tokens.refreshToken || tokens.accessToken;

    const data = await graphGet<{
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        picture?: { data?: { url?: string } };
      }>;
    }>(`${GRAPH_BASE}/me/accounts?fields=id,name,access_token,picture`, userToken);

    return (data.data || []).map((page) => ({
      id: crypto.randomUUID(),
      platform: 'facebook' as const,
      platformAccountId: page.id,
      accountName: page.name,
      avatarUrl: page.picture?.data?.url,
      accountType: 'page',
      isActive: true,
    }));
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    // Facebook long-lived tokens auto-refresh on use; no refresh grant exists.
    // Return the existing tokens — the user must re-authorize if truly expired.
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
    const pageId = account.platformAccountId;
    let pageToken = tokens.accessToken;

    // If the stored token is a user token (accountType was 'user'), resolve the page token
    if (account.accountType === 'user' && tokens.refreshToken) {
      const data = await graphGet<{
        data: Array<{ id: string; access_token: string }>;
      }>(`${GRAPH_BASE}/me/accounts?fields=id,access_token`, tokens.refreshToken);

      const match = data.data?.find((p) => p.id === pageId);
      if (!match) {
        return {
          success: false,
          error: `Page ${pageId} not found or not managed by this user`,
          errorCode: 'PAGE_NOT_FOUND',
        };
      }
      pageToken = match.access_token;
    }

    // TODO: Support photo posts via /{pageId}/photos and video posts via /{pageId}/videos
    const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content.caption,
        access_token: pageToken,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Facebook publish failed (${res.status}): ${errText}`,
        errorCode: String(res.status),
      };
    }

    const result = (await res.json()) as { id?: string };
    return {
      success: true,
      platformPostId: result.id,
      publishedUrl: result.id
        ? `https://www.facebook.com/${result.id}`
        : undefined,
    };
  },

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (content.caption && content.caption.length > MAX_CAPTION_LENGTH) {
      errors.push(
        `Caption exceeds Facebook's ${MAX_CAPTION_LENGTH}-character limit (${content.caption.length} chars)`,
      );
    }
    return { valid: errors.length === 0, errors };
  },
};
