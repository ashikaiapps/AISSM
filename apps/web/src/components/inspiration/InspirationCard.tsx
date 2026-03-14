import { InspirationItemWithSource } from '../../types/inspiration';
import { timeAgo } from '../../utils/timeAgo';

const SOURCE_TYPE_ICONS: Record<string, string> = {
  reddit: '🔴',
  hackernews: '🟠',
  rss: '🟡',
  youtube: '🔵',
  producthunt: '🟤',
};

interface InspirationCardProps {
  item: InspirationItemWithSource;
  onSave: (itemId: string, isSaved: boolean) => void;
  onDismiss: (itemId: string) => void;
  onDraft: (item: InspirationItemWithSource) => void;
}

export function InspirationCard({ item, onSave, onDismiss, onDraft }: InspirationCardProps) {
  const isUnread = item.status === 'unread';
  const truncatedBody = item.body ? item.body.slice(0, 150) + (item.body.length > 150 ? '...' : '') : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border-l-4 p-4 hover:shadow-md transition ${
        isUnread ? 'border-l-indigo-500' : 'border-l-gray-300'
      }`}
    >
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{SOURCE_TYPE_ICONS[item.type]}</span>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {item.sourceName}
            </span>
            {isUnread && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                New
              </span>
            )}
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-gray-900 hover:text-indigo-600 line-clamp-2 block mb-2"
          >
            {item.title}
          </a>

          {truncatedBody && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{truncatedBody}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            {item.authorName && <span>by {item.authorName}</span>}
            {item.score !== undefined && (
              <span className="flex items-center gap-1">
                ↑ <span className="font-medium">{item.score}</span>
              </span>
            )}
            {item.commentCount !== undefined && (
              <span className="flex items-center gap-1">
                💬 <span className="font-medium">{item.commentCount}</span>
              </span>
            )}
            <span>{timeAgo(item.publishedAt || item.createdAt)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSave(item.id, !item.isSaved)}
              className={`px-3 py-1 text-xs rounded font-medium transition ${
                item.isSaved
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.isSaved ? '⭐ Saved' : '☆ Save'}
            </button>
            <button
              onClick={() => onDraft(item)}
              className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded font-medium hover:bg-indigo-100"
            >
              ✏️ Create Draft
            </button>
            <button
              onClick={() => onDismiss(item.id)}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded font-medium hover:bg-gray-200"
            >
              × Dismiss
            </button>
          </div>
        </div>

        {item.thumbnailUrl && (
          <div className="flex-shrink-0 w-32 h-32">
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
