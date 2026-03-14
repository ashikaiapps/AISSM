import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Find .env by walking up from CWD to the monorepo root
// Prefers directories that also contain .env.example or a workspace package.json
function findEnvFile(): string {
  let dir = process.cwd();
  let fallback = '';
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) {
      // Prefer the .env that's at the monorepo root (has .env.example or workspaced package.json)
      const hasExample = existsSync(resolve(dir, '.env.example'));
      const pkgPath = resolve(dir, 'package.json');
      const isMonoRoot = existsSync(pkgPath) &&
        readFileSync(pkgPath, 'utf-8').includes('"workspaces"');
      if (hasExample || isMonoRoot) return candidate;
      if (!fallback) fallback = candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return fallback || resolve(process.cwd(), '.env');
}

// Canonical .env file location — overridable via ENV_FILE_PATH for Electron prod
export const ENV_FILE_PATH = process.env.ENV_FILE_PATH || findEnvFile();

// Auto-generate secure secrets on first run if still placeholder values
function ensureSecrets() {
  if (!existsSync(ENV_FILE_PATH)) return;

  let content = readFileSync(ENV_FILE_PATH, 'utf-8');
  let changed = false;

  // Generate SESSION_SECRET if placeholder
  if (/SESSION_SECRET=CHANGE-ME/.test(content) || !/SESSION_SECRET=.+/.test(content)) {
    const secret = randomBytes(32).toString('base64');
    if (/^SESSION_SECRET=.*$/m.test(content)) {
      content = content.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`);
    } else {
      content += `\nSESSION_SECRET=${secret}\n`;
    }
    process.env.SESSION_SECRET = secret;
    changed = true;
  }

  // Generate ENCRYPTION_KEY if placeholder
  if (/ENCRYPTION_KEY=CHANGE-ME/.test(content) || !/ENCRYPTION_KEY=.+/.test(content)) {
    const key = randomBytes(32).toString('hex');
    if (/^ENCRYPTION_KEY=.*$/m.test(content)) {
      content = content.replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${key}`);
    } else {
      content += `\nENCRYPTION_KEY=${key}\n`;
    }
    process.env.ENCRYPTION_KEY = key;
    changed = true;
  }

  if (changed) {
    writeFileSync(ENV_FILE_PATH, content, 'utf-8');
    console.log('🔑 Auto-generated secure secrets in .env');
  }
}

ensureSecrets();
config({ path: ENV_FILE_PATH });

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

  // InspirationFeed
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  PRODUCT_HUNT_TOKEN: process.env.PRODUCT_HUNT_TOKEN || '',

  validateSecrets,
};
