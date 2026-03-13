import { useState, useEffect } from 'react';

interface Account {
  id: string;
  platform: string;
  accountName: string;
  handle?: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: '💼',
  facebook: '📘',
  instagram: '📸',
  youtube: '🎬',
  tiktok: '🎵',
};

export function ComposerPage() {
  const [caption, setCaption] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/accounts')
      .then(r => r.json())
      .then(data => setAccounts(data.accounts || []))
      .catch(console.error);
  }, []);

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publishPost = async () => {
    if (!caption.trim() || selectedAccountIds.size === 0) return;
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          accountIds: Array.from(selectedAccountIds),
        }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  // Group accounts by platform
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, account) => {
    (acc[account.platform] ||= []).push(account);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold mb-6">New Post</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Caption editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What do you want to share? Use @mentions and #hashtags..."
              className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{caption.length} characters</span>
              <span>Tip: Use @username to tag people</span>
            </div>
          </div>

          {/* Media upload placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-dashed p-8 text-center">
            <p className="text-gray-400">📎 Drag & drop media here (coming soon)</p>
          </div>
        </div>

        {/* Account selector + publish */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Post to:</h3>

            {accounts.length === 0 ? (
              <p className="text-sm text-gray-400">No accounts connected. <a href="/accounts" className="text-indigo-600 underline">Connect one →</a></p>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([platform, accs]) => (
                  <div key={platform}>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                      {PLATFORM_ICONS[platform]} {platform}
                    </p>
                    {accs.map(acc => (
                      <label key={acc.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAccountIds.has(acc.id)}
                          onChange={() => toggleAccount(acc.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm">{acc.accountName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={publishPost}
            disabled={publishing || !caption.trim() || selectedAccountIds.size === 0}
            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {publishing ? '⏳ Publishing...' : `🚀 Post Now${selectedAccountIds.size > 0 ? ` (${selectedAccountIds.size} accounts)` : ''}`}
          </button>

          {result && (
            <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-48">
              {result}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
