import type { PlatformAdapter } from './base.js';
import type { ConnectedAccount, OAuthTokens, PostContent, PublishResult } from '@socialkeys/shared';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { readFileSync, statSync, existsSync } from 'fs';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export const youtubeAdapter: PlatformAdapter = {
  platform: 'youtube',
  displayName: 'YouTube',

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      state,
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<{ account: ConnectedAccount; tokens: OAuthTokens }> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`YouTube token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
      token_type: string;
    };

    // Fetch the authenticated user's YouTube channel
    const channelParams = new URLSearchParams({ part: 'snippet', mine: 'true' });
    const channelRes = await fetch(`${CHANNELS_URL}?${channelParams.toString()}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!channelRes.ok) {
      const err = await channelRes.text();
      throw new Error(`YouTube channel fetch failed: ${err}`);
    }

    const channelData = (await channelRes.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          customUrl?: string;
          thumbnails?: { default?: { url: string } };
        };
      }>;
    };

    const channel = channelData.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found for this account');
    }

    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      platform: 'youtube',
      platformAccountId: channel.id,
      accountName: channel.snippet.title,
      handle: channel.snippet.customUrl,
      avatarUrl: channel.snippet.thumbnails?.default?.url,
      accountType: 'channel',
      isActive: true,
    };

    const now = new Date();
    const tokens: OAuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type || 'Bearer',
      scopes: tokenData.scope || SCOPES,
      expiresAt: new Date(now.getTime() + tokenData.expires_in * 1000),
    };

    return { account, tokens };
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`YouTube token refresh failed: ${err}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    const now = new Date();
    return {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Google doesn't rotate refresh tokens
      tokenType: data.token_type || 'Bearer',
      scopes: data.scope || SCOPES,
      expiresAt: new Date(now.getTime() + data.expires_in * 1000),
    };
  },

  async publishPost(
    content: PostContent,
    _account: ConnectedAccount,
    tokens: OAuthTokens,
  ): Promise<PublishResult> {
    if (!content.mediaUrls?.length) {
      return {
        success: false,
        error: 'YouTube requires a video file to publish',
        errorCode: 'MISSING_VIDEO',
      };
    }

    const videoPath = content.mediaUrls[0];
    if (!existsSync(videoPath)) {
      return {
        success: false,
        error: `Video file not found: ${videoPath}`,
        errorCode: 'FILE_NOT_FOUND',
      };
    }

    const fileStat = statSync(videoPath);
    const fileBuffer = readFileSync(videoPath);

    const title = content.caption.substring(0, 100);
    const description = content.caption;
    const tags = content.hashtags?.map((h) => h.replace(/^#/, '')) ?? [];

    // Step 1: Initiate resumable upload
    const uploadParams = new URLSearchParams({
      uploadType: 'resumable',
      part: 'snippet,status',
    });

    const metadata = {
      snippet: { title, description, tags },
      status: { privacyStatus: 'public' },
    };

    const initRes = await fetch(`${UPLOAD_URL}?${uploadParams.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(fileStat.size),
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify(metadata),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      return {
        success: false,
        error: `YouTube upload init failed (${initRes.status}): ${errText}`,
        errorCode: String(initRes.status),
      };
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      return {
        success: false,
        error: 'YouTube upload init did not return an upload URL',
        errorCode: 'NO_UPLOAD_URL',
      };
    }

    // Step 2: Upload the video binary
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/*',
        'Content-Length': String(fileStat.size),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return {
        success: false,
        error: `YouTube video upload failed (${uploadRes.status}): ${errText}`,
        errorCode: String(uploadRes.status),
      };
    }

    const videoData = (await uploadRes.json()) as { id: string };

    return {
      success: true,
      platformPostId: videoData.id,
      publishedUrl: `https://youtube.com/shorts/${videoData.id}`,
    };
  },

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (content.caption && content.caption.length > 5000) {
      errors.push(
        `Description exceeds YouTube's 5000-character limit (${content.caption.length} chars)`,
      );
    }

    if (!content.mediaUrls?.length) {
      errors.push('YouTube requires at least one video file');
    } else if (!existsSync(content.mediaUrls[0])) {
      errors.push(`Video file not found: ${content.mediaUrls[0]}`);
    }

    return { valid: errors.length === 0, errors };
  },
};
