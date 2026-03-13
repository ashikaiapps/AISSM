import { useState, useEffect, useMemo } from 'react';
import { MediaDropZone, type MediaFile } from '../components/MediaDropZone.js';

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

const PLATFORM_LIMITS: Record<string, { maxCaption: number; maxMedia: number; mediaNote?: string }> = {
  linkedin: { maxCaption: 3000, maxMedia: 20 },
  facebook: { maxCaption: 63206, maxMedia: 10 },
  instagram: { maxCaption: 2200, maxMedia: 10, mediaNote: 'Requires at least 1 image or video' },
  youtube: { maxCaption: 5000, maxMedia: 1, mediaNote: 'Video required (Shorts ≤ 60s)' },
  tiktok: { maxCaption: 2200, maxMedia: 1, mediaNote: 'Video required' },
};

export function ComposerPage() {
  const [caption, setCaption] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const selectAll = () => {
    setSelectedAccountIds(new Set(accounts.map(a => a.id)));
  };

  const selectNone = () => {
    setSelectedAccountIds(new Set());
  };

  // Validation warnings based on selected platforms
  const warnings = useMemo(() => {
    const msgs: string[] = [];
    const selectedAccounts = accounts.filter(a => selectedAccountIds.has(a.id));
    const platforms = new Set(selectedAccounts.map(a => a.platform));

    for (const p of platforms) {
      const limits = PLATFORM_LIMITS[p];
      if (!limits) continue;
      if (caption.length > limits.maxCaption) {
        msgs.push(`${PLATFORM_ICONS[p]} ${p}: caption exceeds ${limits.maxCaption} chars`);
      }
      if (mediaFiles.length > limits.maxMedia) {
        msgs.push(`${PLATFORM_ICONS[p]} ${p}: max ${limits.maxMedia} media file(s)`);
      }
      if ((p === 'instagram' || p === 'youtube' || p === 'tiktok') && mediaFiles.length === 0) {
        msgs.push(`${PLATFORM_ICONS[p]} ${p}: ${limits.mediaNote || 'media required'}`);
      }
    }
    return msgs;
  }, [caption, mediaFiles, selectedAccountIds, accounts]);

  const canPublish = caption.trim().length > 0 && selectedAccountIds.size > 0 && !publishing;

  const publishPost = async () => {
    if (!canPublish) return;
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch('/api/v1/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          accountIds: Array.from(selectedAccountIds),
          mediaIds: mediaFiles.map(f => f.id),
        }),
      });
      const data = await res.json();
      const allOk = data.results?.every((r: { success: boolean }) => r.success);
      const summary = data.results?.map((r: { platform: string; success: boolean; error?: string }) =>
        `${PLATFORM_ICONS[r.platform] || '•'} ${r.platform}: ${r.success ? '✅' : `❌ ${r.error}`}`
      ).join('\n') || JSON.stringify(data, null, 2);

      setResult({ type: allOk ? 'success' : 'error', message: summary });

      if (allOk) {
        setCaption('');
        setMediaFiles([]);
        setSelectedAccountIds(new Set());
      }
    } catch (e) {
      setResult({ type: 'error', message: (e as Error).message });
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
        {/* Caption + media */}
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

          {/* Media drop zone */}
          <MediaDropZone
            files={mediaFiles}
            onChange={setMediaFiles}
            maxFiles={10}
            disabled={publishing}
          />

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
              <p className="text-sm font-medium text-amber-800">⚠️ Platform notices</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">{w}</p>
              ))}
            </div>
          )}
        </div>

        {/* Account selector + publish */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Post to:</h3>
              {accounts.length > 1 && (
                <div className="flex gap-2 text-xs">
                  <button onClick={selectAll} className="text-indigo-600 hover:underline">All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={selectNone} className="text-gray-500 hover:underline">None</button>
                </div>
              )}
            </div>

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
            disabled={!canPublish}
            className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {publishing ? '⏳ Publishing...' : `🚀 Post Now${selectedAccountIds.size > 0 ? ` (${selectedAccountIds.size})` : ''}`}
          </button>

          {/* Result feedback */}
          {result && (
            <div className={`rounded-xl p-4 text-sm whitespace-pre-line ${
              result.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-medium mb-1">{result.type === 'success' ? '✅ Published!' : '⚠️ Some issues:'}</p>
              <p className="text-xs">{result.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
