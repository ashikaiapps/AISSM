import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function validateSecrets() {
  const session = process.env.SESSION_SECRET || '';
  const encryption = process.env.ENCRYPTION_KEY || '';
  if (session === 'CHANGE-ME-TO-RANDOM-32-CHARS' || session.length < 16) {
    throw new Error('SESSION_SECRET must be changed from default and be at least 16 chars');
  }
  if (encryption === 'CHANGE-ME-TO-RANDOM-32-BYTE-HEX' || encryption.length < 32) {
    throw new Error('ENCRYPTION_KEY must be changed from default and be at least 32 chars');
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:3001',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || './data/socialkeys.dev.sqlite',
  SESSION_SECRET: process.env.SESSION_SECRET || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // LinkedIn
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || '',
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || '',
  LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/auth/callback/linkedin',

  // Meta (Facebook + Instagram)
  META_APP_ID: process.env.META_APP_ID || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_REDIRECT_URI: process.env.META_REDIRECT_URI || 'http://localhost:3001/auth/callback/facebook',
  META_INSTAGRAM_REDIRECT_URI: process.env.META_INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/auth/callback/instagram',
  META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || 'v21.0',

  // Google / YouTube
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/callback/youtube',

  // TikTok
  TIKTOK_CLIENT_KEY: process.env.TIKTOK_CLIENT_KEY || '',
  TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET || '',
  TIKTOK_REDIRECT_URI: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:3001/auth/callback/tiktok',

  validateSecrets,
};
