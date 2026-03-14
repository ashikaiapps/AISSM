import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InspirationItemWithSource } from '../../types/inspiration';

interface DraftModalProps {
  item: InspirationItemWithSource | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function DraftModal({ item, isOpen, onClose, onCreated }: DraftModalProps) {
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  // Initialize caption when item changes
  useEffect(() => {
    if (item) {
      const bodyPreview = item.body ? item.body.slice(0, 500) : '';
      const generatedCaption = `💡 ${item.title}\n\n${bodyPreview}${bodyPreview.length === 500 ? '...' : ''}\n\nSource: ${item.url}`;
      setCaption(generatedCaption);
      setCreatedPostId(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:3001/api/v1/inspiration/feed/${item.id}/to-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      });
      const data = await res.json();
      setCreatedPostId(data.postId);
      onCreated();
    } catch (e) {
      console.error('Failed to create draft:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInComposer = async () => {
    if (createdPostId) {
      navigate(`/compose?draftId=${createdPostId}`);
      onClose();
    } else {
      setSaving(true);
      try {
        const res = await fetch(`http://localhost:3001/api/v1/inspiration/feed/${item.id}/to-post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption }),
        });
        const data = await res.json();
        navigate(`/compose?draftId=${data.postId}`);
        onClose();
      } catch (e) {
        console.error('Failed to create draft:', e);
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Create Draft Post</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-sm font-medium text-indigo-800 mb-1">{item.title}</p>
            <p className="text-xs text-indigo-600">From: {item.sourceName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption (edit as needed)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Write your post caption..."
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{caption.length} characters</span>
            </div>
          </div>

          {createdPostId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 mb-2">✓ Draft Created!</p>
              <p className="text-xs text-green-700">
                Your draft has been saved. You can open it in the composer to add media and publish.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          {!createdPostId ? (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving || !caption.trim()}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={handleOpenInComposer}
                disabled={saving || !caption.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Open in Composer'}
              </button>
            </>
          ) : (
            <button
              onClick={handleOpenInComposer}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Open in Composer →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
