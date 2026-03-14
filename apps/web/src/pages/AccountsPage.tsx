import { useState, useEffect } from 'react';
import { PlatformSetupModal } from '../components/PlatformSetupModal';
import { ConnectWizard } from '../components/ConnectWizard';

const PLATFORMS = [
  {
    id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-600',
    accountTypes: 'Personal Profile + Company Pages',
    note: 'Personal posts instantly. Company Pages need Marketing Developer Platform.',
  },
  {
    id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-500',
    accountTypes: 'Pages only (API)',
    note: 'Personal profile posting not available via API. Connect your Pages.',
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-pink-500',
    accountTypes: 'Business & Creator accounts',
    note: 'Must be Professional account linked to a Facebook Page.',
  },
  {
    id: 'youtube', name: 'YouTube', icon: '🎬', color: 'bg-red-600',
    accountTypes: 'YouTube Channels (Shorts)',
    note: 'Video-only. Test mode: 100 users, no approval needed.',
  },
  {
    id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gray-900',
    accountTypes: 'TikTok accounts (video)',
    note: 'Video-only. Unaudited apps post as drafts (SELF_ONLY).',
  },
];

interface Account {
  id: string;
  platform: string;
  accountName: string;
  handle?: string;
  avatarUrl?: string;
  accountType?: string;
  isActive: boolean;
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Multi-account setup modal state (for Facebook/Instagram after OAuth)
  const [setupModal, setSetupModal] = useState<{ platform: string; tempId: string } | null>(null);

  const loadAccounts = () => {
    fetch('/api/v1/accounts')
      .then(r => r.json())
      .then(data => setAccounts(data.accounts || []))
      .catch(console.error);
  };

  useEffect(() => {
    loadAccounts();

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    const setupPlatform = params.get('setup');
    const tempId = params.get('tempId');

    if (setupPlatform && tempId) {
      // Multi-account selection needed (Facebook/Instagram)
      setSetupModal({ platform: setupPlatform, tempId });
      window.history.replaceState({}, '', '/accounts');
    } else if (connected) {
      setToast({ type: 'success', message: `✅ ${connected} account connected successfully!` });
      window.history.replaceState({}, '', '/accounts');
    } else if (error) {
      setToast({ type: 'error', message: `❌ Connection failed: ${error}` });
      window.history.replaceState({}, '', '/accounts');
    }
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const connectAccount = (platform: string) => {
    window.location.href = `/auth/${platform}/start`;
  };

  const disconnectAccount = async (id: string) => {
    if (!confirm('Disconnect this account?')) return;
    try {
      await fetch(`/api/v1/accounts/${id}`, { method: 'DELETE' });
      setAccounts(prev => prev.filter(a => a.id !== id));
      setToast({ type: 'success', message: 'Account disconnected.' });
    } catch {
      setToast({ type: 'error', message: 'Failed to disconnect account.' });
    }
  };

  const connectedPlatforms = new Set(accounts.map(a => a.platform));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Connected Accounts</h2>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-indigo-600 text-white text-sm font-semibold py-2.5 px-5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <span>🔑</span> Setup Wizard
        </button>
      </div>

      {/* Quick stats bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
        </div>
        <div className="text-sm text-gray-400">
          {5 - connectedPlatforms.size} platform{5 - connectedPlatforms.size !== 1 ? 's' : ''} remaining
        </div>
      </div>

      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map(platform => {
          const connected = accounts.filter(a => a.platform === platform.id);
          return (
            <div key={platform.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{platform.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold">{platform.name}</h3>
                  {connected.length > 0 && (
                    <span className="text-xs text-green-600 font-medium">{connected.length} connected</span>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium text-indigo-600">{platform.accountTypes}</p>
                <p className="text-xs text-gray-400 mt-0.5">{platform.note}</p>
              </div>

              {connected.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {connected.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg group">
                      <div className="flex items-center gap-2 min-w-0">
                        {acc.avatarUrl ? (
                          <img src={acc.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
                        )}
                        <span className="text-sm font-medium truncate">{acc.accountName}</span>
                        {acc.accountType && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            acc.accountType === 'profile' ? 'bg-blue-100 text-blue-700' :
                            acc.accountType === 'page' ? 'bg-purple-100 text-purple-700' :
                            acc.accountType === 'business' ? 'bg-pink-100 text-pink-700' :
                            acc.accountType === 'channel' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{acc.accountType}</span>
                        )}
                        {acc.handle && <span className="text-xs text-gray-400 truncate">@{acc.handle}</span>}
                      </div>
                      <button
                        onClick={() => disconnectAccount(acc.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0 ml-2"
                        title="Disconnect"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">No accounts connected</p>
              )}

              <button
                onClick={() => connectAccount(platform.id)}
                className={`w-full text-white text-sm font-medium py-2 px-4 rounded-lg ${platform.color} hover:opacity-90 transition`}
              >
                {connected.length > 0 ? '+ Add Another' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Connect Wizard Modal */}
      {showWizard && (
        <ConnectWizard
          connectedPlatforms={connectedPlatforms}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Platform Setup Modal (multi-account selection for Facebook/Instagram) */}
      {setupModal && (
        <PlatformSetupModal
          platform={setupModal.platform}
          tempId={setupModal.tempId}
          onClose={() => {
            setSetupModal(null);
            loadAccounts();
          }}
          onConnected={(count) => {
            setSetupModal(null);
            setToast({ type: 'success', message: `✅ ${count} ${setupModal.platform} account${count !== 1 ? 's' : ''} connected!` });
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}
