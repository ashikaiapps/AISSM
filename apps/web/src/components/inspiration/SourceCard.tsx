import { useState } from 'react';
import { InspirationSourceWithCount } from '../../types/inspiration';
import { timeAgo } from '../../utils/timeAgo';

const SOURCE_TYPE_ICONS: Record<string, string> = {
  reddit: '🔴',
  hackernews: '🟠',
  rss: '🟡',
  youtube: '🔵',
  producthunt: '🟤',
};

interface SourceCardProps {
  source: InspirationSourceWithCount;
  onEdit: (source: InspirationSourceWithCount) => void;
  onFetchNow: (sourceId: string) => void;
  onDelete: (sourceId: string) => void;
  onToggleActive: (sourceId: string, isActive: boolean) => void;
}

export function SourceCard({ source, onEdit, onFetchNow, onDelete, onToggleActive }: SourceCardProps) {
  const [fetching, setFetching] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFetchNow = async () => {
    setFetching(true);
    await onFetchNow(source.id);
    setFetching(false);
  };

  const handleDelete = () => {
    onDelete(source.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{SOURCE_TYPE_ICONS[source.type]}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{source.name}</h3>
            <p className="text-xs text-gray-500 capitalize">{source.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {source.isActive ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Paused
            </span>
          )}
          {source.errorCount > 0 && (
            <span
              className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded font-medium cursor-help"
              title={source.lastError || 'Error fetching'}
            >
              {source.errorCount} errors
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span>{source.itemCount} items</span>
        <span className="text-xs text-gray-400">
          Last fetched: {timeAgo(source.lastFetchedAt)}
        </span>
      </div>

      {showDeleteConfirm ? (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
          <p className="text-sm text-red-800 mb-2">Delete this source? This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-medium"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onToggleActive(source.id, !source.isActive)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 font-medium"
          >
            {source.isActive ? 'Pause' : 'Resume'}
          </button>
          <button
            onClick={() => onEdit(source)}
            className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 text-sm rounded-lg hover:bg-indigo-100 font-medium"
          >
            Edit
          </button>
          <button
            onClick={handleFetchNow}
            disabled={fetching}
            className="flex-1 px-3 py-2 bg-green-50 text-green-600 text-sm rounded-lg hover:bg-green-100 font-medium disabled:opacity-50"
          >
            {fetching ? '⏳ Fetching...' : 'Fetch Now'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 font-medium"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
