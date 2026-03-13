import type { PlatformAdapter } from './base.js';
import type { ConnectedAccount, OAuthTokens, PostContent, PublishResult } from '@socialkeys/shared';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { readFileSync, statSync, existsSync } from 'fs';

const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const USER_INFO_URL = 'https://open.tiktokapis.com/v2/user/info/';
const VIDEO_INIT_URL = 'https://open.tiktokapis.com/v2/post/publish/video/init/';
const PUBLISH_STATUS_URL = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

const SCOPES = 'user.info.basic,video.publish,video.upload';
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_CAPTION_LENGTH = 2200;
const MAX_STATUS_POLLS = 15;
const POLL_INTERVAL_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',
  displayName: 'TikTok',

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      redirect_uri: env.TIKTOK_REDIRECT_URI,
      scope: SCOPES,
      response_type: 'code',
      state,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<{ account: ConnectedAccount; tokens: OAuthTokens }> {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: env.TIKTOK_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`TikTok token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token: string;
      refresh_expires_in: number;
      open_id: string;
      scope: string;
      token_type: string;
    };

    // Fetch user profile
    const userParams = new URLSearchParams({
      fields: 'open_id,display_name,avatar_url,username',
    });
    const userRes = await fetch(`${USER_INFO_URL}?${userParams.toString()}`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      const err = await userRes.text();
      throw new Error(`TikTok user info fetch failed: ${err}`);
    }

    const userData = (await userRes.json()) as {
      data: {
        user: {
          open_id: string;
          display_name: string;
          avatar_url: string;
          username: string;
        };
      };
    };

    const user = userData.data.user;

    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      platform: 'tiktok',
      platformAccountId: tokenData.open_id,
      accountName: user.display_name,
      handle: user.username ? `@${user.username}` : undefined,
      avatarUrl: user.avatar_url,
      accountType: 'creator',
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
        client_key: env.TIKTOK_CLIENT_KEY,
        client_secret: env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TikTok token refresh failed: ${err}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token: string;
      scope: string;
      token_type: string;
    };

    const now = new Date();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
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
        error: 'TikTok requires a video file to publish',
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
    const fileSize = fileStat.size;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    // Step 1: Initialize upload
    const initRes = await fetch(VIDEO_INIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: content.caption.substring(0, MAX_CAPTION_LENGTH),
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: CHUNK_SIZE,
          total_chunk_count: totalChunks,
        },
      }),
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      return {
        success: false,
        error: `TikTok upload init failed (${initRes.status}): ${errText}`,
        errorCode: String(initRes.status),
      };
    }

    const initData = (await initRes.json()) as {
      data: { publish_id: string; upload_url: string };
    };

    const { publish_id, upload_url } = initData.data;
    if (!upload_url) {
      return {
        success: false,
        error: 'TikTok upload init did not return an upload URL',
        errorCode: 'NO_UPLOAD_URL',
      };
    }

    // Step 2: Upload video in chunks
    const fileBuffer = readFileSync(videoPath);

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const start = chunk * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunkBuffer = fileBuffer.subarray(start, end);

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`,
          'Content-Type': 'video/mp4',
        },
        body: chunkBuffer,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return {
          success: false,
          error: `TikTok chunk upload failed (chunk ${chunk + 1}/${totalChunks}): ${errText}`,
          errorCode: String(uploadRes.status),
        };
      }
    }

    // Step 3: Poll publish status
    for (let i = 0; i < MAX_STATUS_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);

      const statusRes = await fetch(PUBLISH_STATUS_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id }),
      });

      if (!statusRes.ok) continue;

      const statusData = (await statusRes.json()) as {
        data: {
          status: string;
          publicaly_available_post_id?: string[];
          fail_reason?: string;
        };
      };

      const status = statusData.data.status;

      if (status === 'PUBLISH_COMPLETE') {
        const postId = statusData.data.publicaly_available_post_id?.[0] ?? publish_id;
        return {
          success: true,
          platformPostId: postId,
          publishedUrl: `https://www.tiktok.com/@me/video/${postId}`,
        };
      }

      if (status !== 'PROCESSING_UPLOAD' && status !== 'PROCESSING_DOWNLOAD') {
        return {
          success: false,
          error: `TikTok publish failed: ${statusData.data.fail_reason || status}`,
          errorCode: status,
        };
      }
    }

    // Upload may still be processing — return publish_id so caller can check later
    return {
      success: true,
      platformPostId: publish_id,
      publishedUrl: undefined,
    };
  },

  async getPostStatus(platformPostId: string, tokens: OAuthTokens): Promise<string> {
    const res = await fetch(PUBLISH_STATUS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: platformPostId }),
    });

    if (!res.ok) {
      throw new Error(`TikTok status fetch failed (${res.status})`);
    }

    const data = (await res.json()) as {
      data: { status: string; fail_reason?: string };
    };

    return data.data.status;
  },

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (content.caption && content.caption.length > MAX_CAPTION_LENGTH) {
      errors.push(
        `Caption exceeds TikTok's ${MAX_CAPTION_LENGTH}-character limit (${content.caption.length} chars)`,
      );
    }

    if (!content.mediaUrls?.length) {
      errors.push('TikTok requires at least one video file');
    } else {
      const videoPath = content.mediaUrls[0];
      const ext = videoPath.split('.').pop()?.toLowerCase();
      if (ext !== 'mp4' && ext !== 'mov') {
        errors.push('TikTok only supports video files (mp4, mov)');
      }
      if (!existsSync(videoPath)) {
        errors.push(`Video file not found: ${videoPath}`);
      }
    }

    return { valid: errors.length === 0, errors };
  },
};
