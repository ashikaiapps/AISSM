import { FeedStats } from '../../types/inspiration';

interface FeedStatsBarProps {
  stats: FeedStats;
}

export function FeedStatsBar({ stats }: FeedStatsBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 mb-6">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-indigo-600 font-semibold">{stats.unreadCount}</span>
          <span className="text-gray-600">📬 unread</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 font-semibold">{stats.savedCount}</span>
          <span className="text-gray-600">⭐ saved</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-semibold">{stats.usedCount}</span>
          <span className="text-gray-600">✅ used</span>
        </div>
        <div className="w-px h-4 bg-gray-300"></div>
        <div className="flex items-center gap-2">
          <span className="text-blue-600 font-semibold">{stats.todayCount}</span>
          <span className="text-gray-600">📊 today</span>
        </div>
      </div>
    </div>
  );
}
