// Supported social platforms
export type Platform = 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  platformAccountId: string;
  accountName: string;
  handle?: string;
  avatarUrl?: string;
  accountType?: string; // 'page' | 'profile' | 'business' | 'creator' | 'channel'
  isActive: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scopes: string;
  expiresAt?: Date;
}

export interface PostContent {
  caption: string;
  mediaUrls?: string[];
  tags?: UserTag[];
  hashtags?: string[];
}

export interface UserTag {
  username: string;
  platformUserId?: string;
  x?: number; // for Instagram photo tags
  y?: number;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  publishedUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface PostAnalytics {
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
  reach?: number;
}

export const PLATFORM_LIMITS: Record<Platform, { maxCaptionLength: number; maxMediaCount: number; supportedMediaTypes: string[] }> = {
  linkedin: { maxCaptionLength: 3000, maxMediaCount: 20, supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'] },
  facebook: { maxCaptionLength: 63206, maxMediaCount: 10, supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'] },
  instagram: { maxCaptionLength: 2200, maxMediaCount: 10, supportedMediaTypes: ['image/jpeg', 'video/mp4'] },
  youtube: { maxCaptionLength: 5000, maxMediaCount: 1, supportedMediaTypes: ['video/mp4', 'video/quicktime'] },
  tiktok: { maxCaptionLength: 2200, maxMediaCount: 1, supportedMediaTypes: ['video/mp4', 'video/quicktime'] },
};
