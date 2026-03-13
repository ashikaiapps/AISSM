import type { PlatformAdapter } from './base.js';
import type { ConnectedAccount, OAuthTokens, PostContent, PublishResult } from '@socialkeys/shared';
import { env } from '../config/env.js';
import crypto from 'crypto';

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const POSTS_URL = 'https://api.linkedin.com/rest/posts';
const ORG_ACLS_URL = 'https://api.linkedin.com/rest/organizationAcls';
const ORG_LOOKUP_URL = 'https://api.linkedin.com/rest/organizations';

// Personal posting + organization admin discovery + org posting
const SCOPES = 'openid profile w_member_social r_organization_admin w_organization_social';

export const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',
  displayName: 'LinkedIn',

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: env.LINKEDIN_CLIENT_ID,
      redirect_uri: env.LINKEDIN_REDIRECT_URI,
      state,
      scope: SCOPES,
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
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: env.LINKEDIN_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`LinkedIn token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
      token_type: string;
    };

    // Fetch personal profile
    const profileRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const err = await profileRes.text();
      throw new Error(`LinkedIn profile fetch failed: ${err}`);
    }

    const profile = (await profileRes.json()) as {
      sub: string;
      name: string;
      picture?: string;
    };

    const account: ConnectedAccount = {
      id: crypto.randomUUID(),
      platform: 'linkedin',
      platformAccountId: profile.sub,
      accountName: profile.name,
      avatarUrl: profile.picture,
      accountType: 'profile',
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

  // Discover personal profile + company pages the user administers
  async listAvailableAccounts(tokens: OAuthTokens): Promise<ConnectedAccount[]> {
    const accounts: ConnectedAccount[] = [];

    // 1. Personal profile (always available with w_member_social)
    try {
      const profileRes = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as { sub: string; name: string; picture?: string };
        accounts.push({
          id: crypto.randomUUID(),
          platform: 'linkedin',
          platformAccountId: profile.sub,
          accountName: `${profile.name} (Personal)`,
          avatarUrl: profile.picture,
          accountType: 'profile',
          isActive: true,
        });
      }
    } catch {
      // Personal profile fetch failed — continue with org discovery
    }

    // 2. Organization pages (requires r_organization_admin + w_organization_social)
    try {
      const aclRes = await fetch(
        `${ORG_ACLS_URL}?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
          },
        },
      );

      if (aclRes.ok) {
        const aclData = (await aclRes.json()) as {
          elements: Array<{ organization: string }>;
        };

        // Fetch details for each organization
        for (const element of aclData.elements || []) {
          const orgUrn = element.organization; // urn:li:organization:123456
          const orgId = orgUrn.split(':').pop();
          if (!orgId) continue;

          try {
            const orgRes = await fetch(`${ORG_LOOKUP_URL}/${orgId}`, {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': '202401',
              },
            });

            if (orgRes.ok) {
              const org = (await orgRes.json()) as {
                id: number;
                localizedName: string;
                vanityName?: string;
                logoV2?: { original?: string };
              };
              accounts.push({
                id: crypto.randomUUID(),
                platform: 'linkedin',
                platformAccountId: String(org.id),
                accountName: `${org.localizedName} (Company Page)`,
                handle: org.vanityName,
                accountType: 'page',
                isActive: true,
              });
            }
          } catch {
            // Skip org if lookup fails
          }
        }
      }
    } catch {
      // Org discovery failed — user may not have Marketing API access
      // Personal profile is still available
    }

    return accounts;
  },

  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LinkedIn token refresh failed: ${err}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope: string;
      token_type: string;
    };

    const now = new Date();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      tokenType: data.token_type || 'Bearer',
      scopes: data.scope || SCOPES,
      expiresAt: new Date(now.getTime() + data.expires_in * 1000),
    };
  },

  async publishPost(
    content: PostContent,
    account: ConnectedAccount,
    tokens: OAuthTokens,
  ): Promise<PublishResult> {
    // Use urn:li:organization for company pages, urn:li:person for personal
    const author = account.accountType === 'page'
      ? `urn:li:organization:${account.platformAccountId}`
      : `urn:li:person:${account.platformAccountId}`;

    const body = {
      author,
      commentary: content.caption,
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED' },
      lifecycleState: 'PUBLISHED',
    };

    const res = await fetch(POSTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `LinkedIn publish failed (${res.status}): ${errText}`,
        errorCode: String(res.status),
      };
    }

    const postUrn = res.headers.get('x-restli-id') || undefined;
    return {
      success: true,
      platformPostId: postUrn,
      publishedUrl: postUrn
        ? `https://www.linkedin.com/feed/update/${postUrn}`
        : undefined,
    };
  },

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (content.caption && content.caption.length > 3000) {
      errors.push(`Caption exceeds LinkedIn's 3000-character limit (${content.caption.length} chars)`);
    }
    return { valid: errors.length === 0, errors };
  },
};
