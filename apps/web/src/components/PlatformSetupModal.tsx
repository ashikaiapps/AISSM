import { useState, useEffect } from 'react';

interface DiscoveredAccount {
  id: string;
  platform: string;
  platformAccountId: string;
  accountName: string;
  handle?: string;
  avatarUrl?: string;
  accountType?: string;
}

interface PlatformSetupModalProps {
  platform: string;
  tempId: string;
  onClose: () => void;
  onConnected: (count: number) => void;
}

const PLATFORM_META: Record<string, { name: string; icon: string; color: string; description: string }> = {
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-500',
    description: 'Select which Facebook Pages to connect. You can post to any connected Page.',
  },
  instagram: {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-pink-500',
    description: 'Select which Instagram Business accounts to connect. Each must be linked to a Facebook Page.',
  },
};

export function PlatformSetupModal({ platform, tempId, onClose, onConnected }: PlatformSetupModalProps) {
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = PLATFORM_META[platform] || {
    name: platform,
    icon: '🔗',
    color: 'bg-gray-500',
    description: 'Select accounts to connect.',
  };

  useEffect(() => {
    fetch(`/api/v1/accounts/discover/${tempId}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to discover accounts');
        return r.json();
      })
      .then(data => {
        setAccounts(data.accounts || []);
        // Pre-select all by default
        setSelected(new Set((data.accounts || []).map((a: DiscoveredAccount) => a.platformAccountId)));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [tempId]);

  const toggleAccount = (platformAccountId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(platformAccountId)) next.delete(platformAccountId);
      else next.add(platformAccountId);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(accounts.map(a => a.platformAccountId)));
  };

  const selectNone = () => {
    setSelected(new Set());
  };

  const connectSelected = async () => {
    if (selected.size === 0) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/accounts/connect-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempId,
          selectedAccountIds: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to connect accounts');
      }
      const data = await res.json();
      onConnected(data.connected?.length || selected.size);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className={`${meta.color} px-6 py-5 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{meta.icon}</span>
              <div>
                <h2 className="text-xl font-bold">Connect {meta.name}</h2>
                <p className="text-sm opacity-90 mt-0.5">{meta.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-500">Discovering accounts...</span>
            </div>
          ) : error && accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-2">❌ {error}</p>
              <button onClick={onClose} className="text-sm text-indigo-600 underline">Close</button>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No {meta.name} accounts found.</p>
              <p className="text-sm text-gray-400">
                {platform === 'instagram'
                  ? 'Make sure you have an Instagram Business account linked to a Facebook Page.'
                  : 'Make sure you manage at least one Facebook Page.'}
              </p>
            </div>
          ) : (
            <>
              {/* Select all / none controls */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  {selected.size} of {accounts.length} selected
                </span>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline">
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">
                    None
                  </button>
                </div>
              </div>

              {/* Account list */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {accounts.map(acc => (
                  <label
                    key={acc.platformAccountId}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      selected.has(acc.platformAccountId)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(acc.platformAccountId)}
                      onChange={() => toggleAccount(acc.platformAccountId)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    {acc.avatarUrl ? (
                      <img src={acc.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-lg">
                        {meta.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{acc.accountName}</p>
                      <p className="text-xs text-gray-400">
                        {acc.handle && `@${acc.handle} · `}
                        {acc.accountType || 'account'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-sm mt-3">❌ {error}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {accounts.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={connectSelected}
              disabled={connecting || selected.size === 0}
              className="bg-indigo-600 text-white text-sm font-semibold py-2.5 px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {connecting
                ? '⏳ Connecting...'
                : `Connect ${selected.size} Account${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
