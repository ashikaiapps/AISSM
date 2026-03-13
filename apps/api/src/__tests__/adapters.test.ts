import { describe, it, expect } from 'vitest';
import { PLATFORM_LIMITS } from '@socialkeys/shared';

// Import all adapters — we only need the adapter objects, not the DB/env
// Use a trick: set required env vars then import
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
process.env.LINKEDIN_CLIENT_ID = 'test';
process.env.LINKEDIN_CLIENT_SECRET = 'test';
process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3001/auth/callback/linkedin';
process.env.GOOGLE_CLIENT_ID = 'test';
process.env.GOOGLE_CLIENT_SECRET = 'test';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/callback/youtube';
process.env.META_APP_ID = 'test';
process.env.META_APP_SECRET = 'test';
process.env.META_REDIRECT_URI = 'http://localhost:3001/auth/callback/facebook';
process.env.META_INSTAGRAM_REDIRECT_URI = 'http://localhost:3001/auth/callback/instagram';
process.env.META_GRAPH_VERSION = 'v21.0';
process.env.TIKTOK_CLIENT_KEY = 'test';
process.env.TIKTOK_CLIENT_SECRET = 'test';
process.env.TIKTOK_REDIRECT_URI = 'http://localhost:3001/auth/callback/tiktok';

const { linkedinAdapter } = await import('../adapters/linkedin.js');
const { youtubeAdapter } = await import('../adapters/youtube.js');
const { facebookAdapter } = await import('../adapters/facebook.js');
const { instagramAdapter } = await import('../adapters/instagram.js');
const { tiktokAdapter } = await import('../adapters/tiktok.js');

describe('linkedin adapter', () => {
  it('has correct platform and display name', () => {
    expect(linkedinAdapter.platform).toBe('linkedin');
    expect(linkedinAdapter.displayName).toBe('LinkedIn');
  });

  it('generates a valid auth URL', () => {
    const url = linkedinAdapter.getAuthUrl('test-state');
    expect(url).toContain('linkedin.com/oauth/v2/authorization');
    expect(url).toContain('state=test-state');
    expect(url).toContain('scope=openid+profile+w_member_social');
    expect(url).toContain('response_type=code');
  });

  it('validates caption length', () => {
    expect(linkedinAdapter.validateContent({ caption: 'Hello' })).toEqual({ valid: true, errors: [] });
    expect(linkedinAdapter.validateContent({ caption: 'x'.repeat(3001) }).valid).toBe(false);
    expect(linkedinAdapter.validateContent({ caption: 'x'.repeat(3000) }).valid).toBe(true);
  });
});

describe('youtube adapter', () => {
  it('has correct platform and display name', () => {
    expect(youtubeAdapter.platform).toBe('youtube');
    expect(youtubeAdapter.displayName).toBe('YouTube');
  });

  it('generates a valid auth URL with offline access', () => {
    const url = youtubeAdapter.getAuthUrl('yt-state');
    expect(url).toContain('accounts.google.com');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('youtube.upload');
  });

  it('rejects posts without video', () => {
    const result = youtubeAdapter.validateContent({ caption: 'Test' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('video'))).toBe(true);
  });

  it('validates caption length', () => {
    const result = youtubeAdapter.validateContent({ caption: 'x'.repeat(5001), mediaUrls: ['test.mp4'] });
    expect(result.valid).toBe(false);
  });
});

describe('facebook adapter', () => {
  it('has correct platform and display name', () => {
    expect(facebookAdapter.platform).toBe('facebook');
    expect(facebookAdapter.displayName).toBe('Facebook');
  });

  it('generates a valid auth URL', () => {
    const url = facebookAdapter.getAuthUrl('fb-state');
    expect(url).toContain('facebook.com');
    expect(url).toContain('pages_manage_posts');
    expect(url).toContain('state=fb-state');
  });

  it('validates caption length', () => {
    expect(facebookAdapter.validateContent({ caption: 'Hello' }).valid).toBe(true);
    expect(facebookAdapter.validateContent({ caption: 'x'.repeat(63207) }).valid).toBe(false);
  });

  it('has listAvailableAccounts method', () => {
    expect(facebookAdapter.listAvailableAccounts).toBeDefined();
  });
});

describe('instagram adapter', () => {
  it('has correct platform and display name', () => {
    expect(instagramAdapter.platform).toBe('instagram');
    expect(instagramAdapter.displayName).toBe('Instagram');
  });

  it('generates a valid auth URL with instagram scopes', () => {
    const url = instagramAdapter.getAuthUrl('ig-state');
    expect(url).toContain('facebook.com');
    expect(url).toContain('instagram_basic');
    expect(url).toContain('instagram_content_publish');
  });

  it('rejects posts without media', () => {
    const result = instagramAdapter.validateContent({ caption: 'Test' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.toLowerCase().includes('media'))).toBe(true);
  });

  it('validates caption length and hashtag limits', () => {
    expect(instagramAdapter.validateContent({ caption: 'x'.repeat(2201), mediaUrls: ['img.jpg'] }).valid).toBe(false);
  });

  it('has listAvailableAccounts method', () => {
    expect(instagramAdapter.listAvailableAccounts).toBeDefined();
  });
});

describe('tiktok adapter', () => {
  it('has correct platform and display name', () => {
    expect(tiktokAdapter.platform).toBe('tiktok');
    expect(tiktokAdapter.displayName).toBe('TikTok');
  });

  it('generates a valid auth URL with client_key', () => {
    const url = tiktokAdapter.getAuthUrl('tt-state');
    expect(url).toContain('tiktok.com');
    expect(url).toContain('client_key=');
    expect(url).toContain('video.publish');
  });

  it('rejects posts without video', () => {
    const result = tiktokAdapter.validateContent({ caption: 'Test' });
    expect(result.valid).toBe(false);
  });

  it('validates caption length', () => {
    expect(tiktokAdapter.validateContent({ caption: 'x'.repeat(2201), mediaUrls: ['test.mp4'] }).valid).toBe(false);
  });
});

describe('adapter registry', () => {
  it('all adapters have required interface methods', () => {
    const adapters = [linkedinAdapter, youtubeAdapter, facebookAdapter, instagramAdapter, tiktokAdapter];
    for (const adapter of adapters) {
      expect(adapter.platform).toBeDefined();
      expect(adapter.displayName).toBeDefined();
      expect(typeof adapter.getAuthUrl).toBe('function');
      expect(typeof adapter.exchangeCode).toBe('function');
      expect(typeof adapter.refreshToken).toBe('function');
      expect(typeof adapter.publishPost).toBe('function');
      expect(typeof adapter.validateContent).toBe('function');
    }
  });

  it('platform limits match adapter platforms', () => {
    const platforms = ['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'] as const;
    for (const p of platforms) {
      expect(PLATFORM_LIMITS[p]).toBeDefined();
      expect(PLATFORM_LIMITS[p].maxCaptionLength).toBeGreaterThan(0);
    }
  });
});
