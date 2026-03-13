import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { env, ENV_FILE_PATH } from '../config/env.js';

export const settingsRoutes = Router();

// ---------------------------------------------------------------------------
// Platform → env-var mapping
// ---------------------------------------------------------------------------

const PLATFORM_MAP: Record<
  string,
  { clientIdKey: string; secretKey: string; redirectKeys: string[] }
> = {
  linkedin: {
    clientIdKey: 'LINKEDIN_CLIENT_ID',
    secretKey: 'LINKEDIN_CLIENT_SECRET',
    redirectKeys: ['LINKEDIN_REDIRECT_URI'],
  },
  facebook: {
    clientIdKey: 'META_APP_ID',
    secretKey: 'META_APP_SECRET',
    redirectKeys: ['META_REDIRECT_URI', 'META_INSTAGRAM_REDIRECT_URI'],
  },
  instagram: {
    clientIdKey: 'META_APP_ID',
    secretKey: 'META_APP_SECRET',
    redirectKeys: ['META_INSTAGRAM_REDIRECT_URI', 'META_REDIRECT_URI'],
  },
  youtube: {
    clientIdKey: 'GOOGLE_CLIENT_ID',
    secretKey: 'GOOGLE_CLIENT_SECRET',
    redirectKeys: ['GOOGLE_REDIRECT_URI'],
  },
  tiktok: {
    clientIdKey: 'TIKTOK_CLIENT_KEY',
    secretKey: 'TIKTOK_CLIENT_SECRET',
    redirectKeys: ['TIKTOK_REDIRECT_URI'],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a value from the live env object, falling back to process.env. */
function readEnv(key: string): string {
  return (env as Record<string, unknown>)[key] as string ?? process.env[key] ?? '';
}

/** Mask a client ID for display — keep first 2 and last 2 chars. */
function maskClientId(value: string): string {
  if (value.length <= 6) return value;
  return `${value.slice(0, 2)}${'x'.repeat(Math.min(value.length - 4, 10))}${value.slice(-2)}`;
}

function buildPlatformStatus(platform: string) {
  const mapping = PLATFORM_MAP[platform];
  if (!mapping) return null;

  const clientId = readEnv(mapping.clientIdKey);
  const secret = readEnv(mapping.secretKey);
  const hasSecret = secret.length > 0;
  const configured = clientId.length > 0 && hasSecret;

  const redirectUris: Record<string, string> = {};
  for (const key of mapping.redirectKeys) {
    redirectUris[key] = readEnv(key);
  }

  return {
    configured,
    clientId: clientId.length > 0 ? maskClientId(clientId) : '',
    hasSecret,
    // Return the first redirect URI as the primary one
    redirectUri: readEnv(mapping.redirectKeys[0]),
    // Include all redirect URIs if there are multiple
    ...(mapping.redirectKeys.length > 1
      ? { redirectUris }
      : {}),
  };
}

/** Update or append a KEY=VALUE line in a .env file string. */
function upsertEnvLine(content: string, key: string, value: string): string {
  const escaped = value.replace(/"/g, '\\"');
  const newLine = `${key}="${escaped}"`;
  const regex = new RegExp(`^${key}=.*$`, 'm');

  if (regex.test(content)) {
    return content.replace(regex, newLine);
  }
  // Append with a newline if the file doesn't end with one
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : '';
  return `${content}${separator}${newLine}\n`;
}

// ---------------------------------------------------------------------------
// GET /platforms — return configuration status for every platform
// ---------------------------------------------------------------------------

settingsRoutes.get('/platforms', (_req, res) => {
  const platforms: Record<string, ReturnType<typeof buildPlatformStatus>> = {};
  for (const platform of Object.keys(PLATFORM_MAP)) {
    platforms[platform] = buildPlatformStatus(platform);
  }
  res.json({ platforms });
});

// ---------------------------------------------------------------------------
// PUT /platforms/:platform — update credentials for a platform
// ---------------------------------------------------------------------------

settingsRoutes.put('/platforms/:platform', (req, res) => {
  const { platform } = req.params;
  const mapping = PLATFORM_MAP[platform];

  if (!mapping) {
    res.status(400).json({ error: `Unknown platform: ${platform}` });
    return;
  }

  // Instagram shares Meta credentials — redirect to facebook
  if (platform === 'instagram') {
    res.status(400).json({
      error: 'Instagram uses Meta (Facebook) credentials. Update the "facebook" platform instead.',
    });
    return;
  }

  const { clientId, clientSecret } = req.body as {
    clientId?: string;
    clientSecret?: string;
  };

  if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    res.status(400).json({ error: 'Both clientId and clientSecret are required as strings.' });
    return;
  }

  try {
    // 1. Read the .env file (create if missing)
    let envContent = '';
    if (existsSync(ENV_FILE_PATH)) {
      envContent = readFileSync(ENV_FILE_PATH, 'utf-8');
    }

    // 2. Update the relevant lines
    envContent = upsertEnvLine(envContent, mapping.clientIdKey, clientId);
    envContent = upsertEnvLine(envContent, mapping.secretKey, clientSecret);

    // 3. Write back to disk
    writeFileSync(ENV_FILE_PATH, envContent, 'utf-8');

    // 4. Update process.env so new OAuth flows pick up the values immediately
    process.env[mapping.clientIdKey] = clientId;
    process.env[mapping.secretKey] = clientSecret;

    // 5. Update the in-memory env object (it was set at import time)
    (env as Record<string, unknown>)[mapping.clientIdKey] = clientId;
    (env as Record<string, unknown>)[mapping.secretKey] = clientSecret;

    const configured = clientId.length > 0 && clientSecret.length > 0;
    res.json({ success: true, configured });
  } catch (err) {
    console.error(`Failed to update credentials for ${platform}:`, err);
    res.status(500).json({ error: 'Failed to write credentials.' });
  }
});
