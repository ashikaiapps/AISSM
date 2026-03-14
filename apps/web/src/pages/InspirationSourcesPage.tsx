import { useState, useEffect } from 'react';
import { InspirationSourceWithCount } from '../types/inspiration';
import { SourceCard } from '../components/inspiration/SourceCard';
import { AddSourceModal } from '../components/inspiration/AddSourceModal';

const QUICK_START_CARDS = [
  { icon: '🔴', title: 'Reddit', desc: 'Track trending posts from your favorite subreddits' },
  { icon: '🟠', title: 'Hacker News', desc: 'Stay updated with top tech stories' },
  { icon: '🟡', title: 'RSS Feeds', desc: 'Follow any blog or website with RSS' },
];

export function InspirationSourcesPage() {
  const [sources, setSources] = useState<InspirationSourceWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<InspirationSourceWithCount | undefined>();

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/v1/inspiration/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (e) {
      console.error('Failed to fetch sources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAddSource = () => {
    setEditingSource(undefined);
    setShowModal(true);
  };

  const handleEditSource = (source: InspirationSourceWithCount) => {
    setEditingSource(source);
    setShowModal(true);
  };

  const handleSourceCreated = () => {
    setShowModal(false);
    setEditingSource(undefined);
    fetchSources();
  };

  const handleFetchNow = async (sourceId: string) => {
    try {
      await fetch(`http://localhost:3001/api/v1/inspiration/sources/${sourceId}/fetch`, {
        method: 'POST',
      });
      fetchSources();
    } catch (e) {
      console.error('Failed to fetch source:', e);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await fetch(`http://localhost:3001/api/v1/inspiration/sources/${sourceId}`, {
        method: 'DELETE',
      });
      fetchSources();
    } catch (e) {
      console.error('Failed to delete source:', e);
    }
  };

  const handleToggleActive = async (sourceId: string, isActive: boolean) => {
    try {
      await fetch(`http://localhost:3001/api/v1/inspiration/sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchSources();
    } catch (e) {
      console.error('Failed to toggle source:', e);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">📡 Inspiration Sources</h2>
        <button
          onClick={handleAddSource}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          + Add Source
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading sources...</div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🚀 Get Started with Inspiration Sources
          </h3>
          <p className="text-gray-600 mb-6">
            Connect to content sources to automatically discover ideas for your next social post.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {QUICK_START_CARDS.map((card, i) => (
              <div key={i} className="p-4 border border-gray-200 rounded-lg">
                <div className="text-3xl mb-2">{card.icon}</div>
                <h4 className="font-semibold text-gray-900">{card.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddSource}
            className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            + Add Your First Source
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              onEdit={handleEditSource}
              onFetchNow={handleFetchNow}
              onDelete={handleDeleteSource}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <AddSourceModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSource(undefined);
        }}
        onCreated={handleSourceCreated}
        editSource={editingSource}
      />
    </div>
  );
}
