import { useState, useEffect } from 'react';

interface PlatformConfig {
  configured: boolean;
  clientId: string;
  hasSecret: boolean;
  redirectUri: string;
  redirectUris?: Record<string, string>;
}

interface PlatformSetup {
  id: string;
  name: string;
  icon: string;
  color: string;
  envLabel: { id: string; secret: string };
  registrationUrl: string;
  steps: string[];
  scopes: string;
  notes?: string;
}

const PLATFORM_SETUP: PlatformSetup[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    envLabel: { id: 'Client ID', secret: 'Client Secret' },
    registrationUrl: 'https://www.linkedin.com/developers/apps',
    steps: [
      'Go to LinkedIn Developers and click "Create App"',
      'Fill in app name (e.g., "SocialKeys"), your LinkedIn Page, and logo',
      'Under Products, request "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect"',
      'For Company Page posting: also request "Marketing Developer Platform" (may require approval)',
      'Go to Auth tab → copy Client ID and Client Secret',
      'Add redirect URL: http://localhost:3001/auth/callback/linkedin',
    ],
    scopes: 'openid, profile, w_member_social, r_organization_admin, w_organization_social',
    notes: 'Personal posting works immediately. Company Page posting requires Marketing Developer Platform approval from LinkedIn.',
  },
  {
    id: 'facebook',
    name: 'Facebook & Instagram',
    icon: '📘',
    color: 'bg-blue-500',
    envLabel: { id: 'App ID', secret: 'App Secret' },
    registrationUrl: 'https://developers.facebook.com/apps/create/',
    steps: [
      'Go to Meta for Developers and click "Create App"',
      'Choose "Business" type, name it (e.g., "SocialKeys")',
      'In Dashboard → Add Products → add "Facebook Login" and "Instagram Graph API"',
      'Go to Facebook Login → Settings → add redirect URI: http://localhost:3001/auth/callback/facebook',
      'Also add redirect URI: http://localhost:3001/auth/callback/instagram',
      'Go to Settings → Basic → copy App ID and App Secret',
    ],
    scopes: 'pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish',
    notes: 'You can test with your own account immediately. Public access requires App Review (5-10 business days).',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🎬',
    color: 'bg-red-600',
    envLabel: { id: 'Client ID', secret: 'Client Secret' },
    registrationUrl: 'https://console.cloud.google.com/apis/credentials',
    steps: [
      'Go to Google Cloud Console → create a new project (or select existing)',
      'Enable "YouTube Data API v3" in APIs & Services → Library',
      'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID',
      'Application type: Web application',
      'Add authorized redirect URI: http://localhost:3001/auth/callback/youtube',
      'Copy the Client ID and Client Secret',
      'Go to OAuth Consent Screen → add yourself as a test user',
    ],
    scopes: 'youtube.upload, youtube.readonly, userinfo.profile',
    notes: 'Works in test mode immediately (up to 100 test users). Verification needed for public access.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-gray-900',
    envLabel: { id: 'Client Key', secret: 'Client Secret' },
    registrationUrl: 'https://developers.tiktok.com/apps/',
    steps: [
      'Go to TikTok for Developers and click "Manage Apps" → "Connect an app"',
      'Fill in app name and description',
      'Under Products, add "Login Kit" and "Content Posting API"',
      'Set redirect URI: http://localhost:3001/auth/callback/tiktok',
      'Copy the Client Key and Client Secret from the app details',
    ],
    scopes: 'user.info.basic, video.publish, video.upload',
    notes: 'Unaudited apps can only post to your drafts. Public posting requires TikTok audit (2-6 weeks).',
  },
];

export function SetupPage() {
  const [configs, setConfigs] = useState<Record<string, PlatformConfig>>({});
  const [loading, setLoading] = useState(true);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ clientId: string; clientSecret: string }>({ clientId: '', clientSecret: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadConfigs = () => {
    fetch('/api/v1/settings/platforms')
      .then(r => r.json())
      .then(data => setConfigs(data.platforms || {}))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConfigs(); }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const startEditing = (platformId: string) => {
    const config = configs[platformId];
    setEditingPlatform(platformId);
    setFormData({
      clientId: config?.clientId || '',
      clientSecret: '',
    });
  };

  const saveCredentials = async (platformId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/settings/platforms/${platformId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setToast({ type: 'success', message: `✅ ${platformId} credentials saved!` });
      setEditingPlatform(null);
      loadConfigs();
    } catch (err) {
      setToast({ type: 'error', message: `❌ ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  };

  const configuredCount = Object.values(configs).filter(c => c.configured).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-2">Platform Setup</h2>
      <p className="text-gray-500 mb-6">
        Configure your developer app credentials for each platform. You need to register an app with each platform first.
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500">{configuredCount} of {PLATFORM_SETUP.length} platforms configured</span>
          {configuredCount === PLATFORM_SETUP.length && (
            <span className="text-green-600 font-medium">🎉 All set! Go to Accounts to connect.</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(configuredCount / PLATFORM_SETUP.length) * 100}%` }}
          />
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      {/* Platform cards */}
      <div className="space-y-4">
        {PLATFORM_SETUP.map(platform => {
          const config = configs[platform.id] || configs['facebook']; // instagram falls back to facebook
          const isConfigured = config?.configured || false;
          const isExpanded = expandedPlatform === platform.id;
          const isEditing = editingPlatform === platform.id;
          const isFacebookBased = platform.id === 'facebook';

          return (
            <div key={platform.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{platform.name}</h3>
                    <p className="text-xs text-gray-400">Scopes: {platform.scopes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isConfigured ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Needs Setup
                    </span>
                  )}
                  <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {/* Step-by-step instructions */}
                  <div className="mt-4 mb-5">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      📋 Setup Steps
                    </h4>
                    <ol className="space-y-2">
                      {platform.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-600">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <a
                      href={platform.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-sm text-indigo-600 hover:underline font-medium"
                    >
                      Open {platform.name} Developer Portal →
                    </a>
                  </div>

                  {platform.notes && (
                    <p className="text-xs text-gray-400 italic mb-4 px-3 py-2 bg-gray-50 rounded-lg">
                      💡 {platform.notes}
                    </p>
                  )}

                  {/* Redirect URIs */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Redirect URI(s) — add in your developer app</h4>
                    <code className="block text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-mono select-all">
                      {config?.redirectUri || `http://localhost:3001/auth/callback/${platform.id}`}
                    </code>
                    {config?.redirectUris && Object.values(config.redirectUris).filter((v, i, arr) => arr.indexOf(v) === i && v !== config.redirectUri).map((uri, i) => (
                      <code key={i} className="block text-xs bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-mono select-all mt-1">
                        {uri}
                      </code>
                    ))}
                  </div>

                  {/* Current status / Edit form */}
                  {isEditing ? (
                    <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{platform.envLabel.id}</label>
                        <input
                          type="text"
                          value={formData.clientId}
                          onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder={`Enter your ${platform.envLabel.id}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{platform.envLabel.secret}</label>
                        <input
                          type="password"
                          value={formData.clientSecret}
                          onChange={e => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder={isConfigured ? '••••••• (leave blank to keep current)' : `Enter your ${platform.envLabel.secret}`}
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveCredentials(platform.id === 'facebook' ? 'facebook' : platform.id)}
                          disabled={saving || !formData.clientId}
                          className="bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {saving ? '⏳ Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => setEditingPlatform(null)}
                          className="text-sm text-gray-500 hover:text-gray-700 py-2 px-4"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div className="text-sm">
                        {isConfigured ? (
                          <span className="text-green-700">
                            ✅ {platform.envLabel.id}: <span className="font-mono">{config?.clientId}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">No credentials configured</span>
                        )}
                      </div>
                      <button
                        onClick={() => startEditing(platform.id)}
                        className={`text-sm font-medium py-1.5 px-4 rounded-lg transition ${
                          isConfigured
                            ? 'text-gray-600 hover:bg-gray-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isConfigured ? 'Edit' : 'Configure'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
