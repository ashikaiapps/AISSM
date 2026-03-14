import { useState, useEffect } from 'react';
import {
  InspirationItemWithSource,
  FeedPagination,
  FeedStats,
  InspirationSource,
  InspirationSourceType,
  InspirationItemStatus,
} from '../types/inspiration';
import { InspirationCard } from '../components/inspiration/InspirationCard';
import { InspirationFilters } from '../components/inspiration/InspirationFilters';
import { DraftModal } from '../components/inspiration/DraftModal';
import { Pagination } from '../components/inspiration/Pagination';
import { FeedStatsBar } from '../components/inspiration/FeedStatsBar';

interface Filters {
  types: Set<InspirationSourceType>;
  status: InspirationItemStatus | 'all';
  sortBy: string;
  sortOrder: string;
  search: string;
}

export function InspirationFeedPage() {
  const [items, setItems] = useState<InspirationItemWithSource[]>([]);
  const [pagination, setPagination] = useState<FeedPagination>({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<Filters>({
    types: new Set(),
    status: 'unread',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [sources, setSources] = useState<InspirationSource[]>([]);
  const [draftModalItem, setDraftModalItem] = useState<InspirationItemWithSource | null>(null);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.types.size > 0) {
        params.set('type', Array.from(filters.types).join(','));
      }
      if (filters.status !== 'all') {
        params.set('status', filters.status);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }

      const res = await fetch(`http://localhost:3001/api/v1/inspiration/feed?${params}`);
      const data = await res.json();
      
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 30, total: 0, totalPages: 0 });
    } catch (e) {
      console.error('Failed to fetch feed:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/inspiration/feed/stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/inspiration/sources');
      const data = await res.json();
      setSources(data.sources || []);
    } catch (e) {
      console.error('Failed to fetch sources:', e);
    }
  };

  useEffect(() => {
    fetchFeed();
    fetchStats();
    fetchSources();
  }, [pagination.page, filters]);

  const handleSave = async (itemId: string, isSaved: boolean) => {
    try {
      await fetch(`http://localhost:3001/api/v1/inspiration/feed/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSaved, status: 'saved' }),
      });
      fetchFeed();
      fetchStats();
    } catch (e) {
      console.error('Failed to save item:', e);
    }
  };

  const handleDismiss = async (itemId: string) => {
    try {
      await fetch(`http://localhost:3001/api/v1/inspiration/feed/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      fetchFeed();
      fetchStats();
    } catch (e) {
      console.error('Failed to dismiss item:', e);
    }
  };

  const handleDraftCreated = () => {
    setDraftModalItem(null);
    fetchFeed();
    fetchStats();
  };

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, page });
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="max-w-7xl">
      <h2 className="text-2xl font-bold mb-6">💡 Inspiration Feed</h2>

      {stats && <FeedStatsBar stats={stats} />}

      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0">
          <InspirationFilters filters={filters} onChange={handleFiltersChange} stats={stats} />
        </aside>

        <main className="flex-1">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading feed...</div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600 mb-2">No items found</p>
              <p className="text-sm text-gray-500">
                {sources.length === 0 ? (
                  <>No sources configured. <a href="/inspiration/sources" className="text-indigo-600 underline">Add a source →</a></>
                ) : (
                  'Try adjusting your filters or check back later'
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {items.map(item => (
                  <InspirationCard
                    key={item.id}
                    item={item}
                    onSave={handleSave}
                    onDismiss={handleDismiss}
                    onDraft={(item) => setDraftModalItem(item)}
                  />
                ))}
              </div>

              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </main>
      </div>

      <DraftModal
        item={draftModalItem}
        isOpen={!!draftModalItem}
        onClose={() => setDraftModalItem(null)}
        onCreated={handleDraftCreated}
      />
    </div>
  );
}
