import { useState, useEffect } from 'react';
import { InspirationSource, InspirationSourceType } from '../../types/inspiration';

const SOURCE_TYPE_INFO = {
  reddit: { icon: '🔴', name: 'Reddit', description: 'Trending posts from subreddits' },
  hackernews: { icon: '🟠', name: 'Hacker News', description: 'Top tech news and discussions' },
  rss: { icon: '🟡', name: 'RSS Feed', description: 'Any RSS/Atom feed' },
  youtube: { icon: '🔵', name: 'YouTube', description: 'Latest videos from channels' },
  producthunt: { icon: '🟤', name: 'Product Hunt', description: 'New product launches' },
};

const INTERVAL_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
];

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  editSource?: InspirationSource;
}

export function AddSourceModal({ isOpen, onClose, onCreated, editSource }: AddSourceModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<InspirationSourceType | null>(null);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string | number>>({});
  const [interval, setInterval] = useState(60);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editSource) {
      setSelectedType(editSource.type);
      setName(editSource.name);
      setConfig(editSource.config as Record<string, string | number>);
      setInterval(editSource.fetchIntervalMinutes);
      setStep(2);
    } else {
      setStep(1);
      setSelectedType(null);
      setName('');
      setConfig({});
      setInterval(60);
      setPreview(null);
      setError('');
    }
  }, [editSource, isOpen]);

  if (!isOpen) return null;

  const handleTypeSelect = (type: InspirationSourceType) => {
    setSelectedType(type);
    setStep(2);
    // Set default config
    if (type === 'reddit') setConfig({ subreddit: '', sort: 'hot', limit: 25 });
    else if (type === 'hackernews') setConfig({ feedType: 'top', limit: 30 });
    else if (type === 'rss') setConfig({ url: '', limit: 20 });
    else if (type === 'youtube') setConfig({ channelId: '', limit: 10 });
    else if (type === 'producthunt') setConfig({ topic: '', limit: 20 });
  };

  const handleValidate = async () => {
    if (!selectedType) return;
    setValidating(true);
    setError('');
    setPreview(null);

    try {
      const res = await fetch('http://localhost:3001/api/v1/inspiration/sources/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, config }),
      });
      const data = await res.json();
      
      if (data.valid) {
        setPreview(data.preview || []);
        if (data.name && !name) setName(data.name);
      } else {
        setError(data.error || 'Validation failed');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType || !name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editSource
        ? `http://localhost:3001/api/v1/inspiration/sources/${editSource.id}`
        : 'http://localhost:3001/api/v1/inspiration/sources';
      
      const res = await fetch(url, {
        method: editSource ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          name,
          config,
          fetchIntervalMinutes: interval,
          isActive: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {editSource ? 'Edit Source' : 'Add Inspiration Source'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Choose a source type:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(SOURCE_TYPE_INFO).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type as InspirationSourceType)}
                    className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition text-left"
                  >
                    <div className="text-3xl mb-2">{info.icon}</div>
                    <h3 className="font-semibold text-gray-900">{info.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{info.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedType && (
            <div className="space-y-4">
              {!editSource && (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-indigo-600 hover:underline mb-2"
                >
                  ← Change source type
                </button>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`My ${SOURCE_TYPE_INFO[selectedType].name} Source`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {selectedType === 'reddit' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subreddit (without r/)</label>
                    <input
                      type="text"
                      value={config.subreddit as string}
                      onChange={(e) => setConfig({ ...config, subreddit: e.target.value })}
                      placeholder="programming"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={config.sort as string}
                      onChange={(e) => setConfig({ ...config, sort: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="hot">Hot</option>
                      <option value="top">Top</option>
                      <option value="new">New</option>
                      <option value="rising">Rising</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit: {config.limit} posts
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={config.limit as number}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selectedType === 'hackernews' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feed Type</label>
                    <div className="flex gap-3">
                      {['top', 'best', 'new'].map(type => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="feedType"
                            value={type}
                            checked={config.feedType === type}
                            onChange={(e) => setConfig({ ...config, feedType: e.target.value })}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="capitalize text-sm">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit: {config.limit} stories
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={config.limit as number}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selectedType === 'rss' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Feed URL</label>
                    <input
                      type="url"
                      value={config.url as string}
                      onChange={(e) => setConfig({ ...config, url: e.target.value })}
                      placeholder="https://example.com/feed.xml"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit: {config.limit} items
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={config.limit as number}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selectedType === 'youtube' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Channel ID or URL
                    </label>
                    <input
                      type="text"
                      value={config.channelId as string}
                      onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                      placeholder="UCxxxxxx or youtube.com/c/channelname"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit: {config.limit} videos
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      value={config.limit as number}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selectedType === 'producthunt' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic (optional)
                    </label>
                    <input
                      type="text"
                      value={config.topic as string}
                      onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                      placeholder="e.g., productivity, developer-tools"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Limit: {config.limit} products
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={config.limit as number}
                      onChange={(e) => setConfig({ ...config, limit: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fetch Interval</label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {INTERVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleValidate}
                  disabled={validating}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                >
                  {validating ? 'Validating...' : 'Validate & Preview'}
                </button>
              </div>

              {preview && Array.isArray(preview) && preview.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">✓ Valid! Preview:</p>
                  <div className="space-y-2">
                    {preview.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="text-xs text-green-700 bg-white p-2 rounded">
                        <div className="font-medium">{item.title}</div>
                        {item.url && <div className="text-green-600 truncate">{item.url}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {step === 2 && (
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : editSource ? 'Update Source' : 'Create Source'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
