import { useState, useEffect } from 'react';
import { InspirationSourceType, InspirationItemStatus, FeedStats } from '../../types/inspiration';

const SOURCE_TYPE_INFO = [
  { type: 'reddit' as InspirationSourceType, icon: '🔴', label: 'Reddit' },
  { type: 'hackernews' as InspirationSourceType, icon: '🟠', label: 'Hacker News' },
  { type: 'rss' as InspirationSourceType, icon: '🟡', label: 'RSS' },
  { type: 'youtube' as InspirationSourceType, icon: '🔵', label: 'YouTube' },
  { type: 'producthunt' as InspirationSourceType, icon: '🟤', label: 'Product Hunt' },
];

const STATUS_OPTIONS: Array<{ value: InspirationItemStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Items' },
  { value: 'unread', label: 'Unread' },
  { value: 'saved', label: 'Saved' },
  { value: 'used', label: 'Used' },
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Date Added (Newest)' },
  { value: 'publishedAt:desc', label: 'Date Published (Newest)' },
  { value: 'score:desc', label: 'Score (Highest)' },
];

interface Filters {
  types: Set<InspirationSourceType>;
  status: InspirationItemStatus | 'all';
  sortBy: string;
  sortOrder: string;
  search: string;
}

interface InspirationFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  stats: FeedStats | null;
}

export function InspirationFilters({ filters, onChange, stats }: InspirationFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onChange({ ...filters, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleType = (type: InspirationSourceType) => {
    const newTypes = new Set(filters.types);
    if (newTypes.has(type)) newTypes.delete(type);
    else newTypes.add(type);
    onChange({ ...filters, types: newTypes });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    onChange({ ...filters, sortBy, sortOrder });
  };

  const clearFilters = () => {
    setSearchInput('');
    onChange({
      types: new Set(),
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: '',
    });
  };

  const hasActiveFilters = filters.types.size > 0 || filters.status !== 'all' || filters.search;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Source</h3>
        <div className="space-y-2">
          {SOURCE_TYPE_INFO.map(({ type, icon, label }) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={filters.types.has(type)}
                onChange={() => toggleType(type)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-lg">{icon}</span>
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
        <div className="space-y-2">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="radio"
                name="status"
                value={value}
                checked={filters.status === value}
                onChange={(e) => onChange({ ...filters, status: e.target.value as InspirationItemStatus | 'all' })}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Sort By</h3>
        <select
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Search</h3>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search titles..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          Clear All Filters
        </button>
      )}

      {stats && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Stats</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Items:</span>
              <span className="font-semibold">{stats.totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Unread:</span>
              <span className="font-semibold text-indigo-600">{stats.unreadCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Saved:</span>
              <span className="font-semibold text-yellow-600">{stats.savedCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Used:</span>
              <span className="font-semibold text-green-600">{stats.usedCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
