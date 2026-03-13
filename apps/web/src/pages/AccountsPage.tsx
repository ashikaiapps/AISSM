import { useState, useEffect } from 'react';

const PLATFORMS = [
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'bg-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: '📘', color: 'bg-blue-500' },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-pink-500' },
  { id: 'youtube', name: 'YouTube', icon: '🎬', color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'bg-gray-900' },
];

interface Account {
  id: string;
  platform: string;
  accountName: string;
  handle?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAccounts = () => {
    fetch('/api/v1/accounts')
      .then(r => r.json())
      .then(data => setAccounts(data.accounts || []))
      .catch(console.error);
  };

  useEffect(() => {
    loadAccounts();

    // Handle OAuth callback query params
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
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

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Connected Accounts</h2>

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
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{platform.icon}</span>
                <h3 className="text-lg font-semibold">{platform.name}</h3>
              </div>

              {connected.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {connected.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg group">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-sm font-medium">{acc.accountName}</span>
                        {acc.handle && <span className="text-xs text-gray-400">@{acc.handle}</span>}
                      </div>
                      <button
                        onClick={() => disconnectAccount(acc.id)}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
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
                {connected.length > 0 ? '+ Add Another Account' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
