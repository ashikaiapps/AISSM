import type { MediaFile } from './MediaDropZone.js';

interface Account {
  id: string;
  platform: string;
  accountName: string;
  handle?: string;
}

interface PostPreviewProps {
  caption: string;
  mediaFiles: MediaFile[];
  selectedAccounts: Account[];
}

function isVideo(mime: string) {
  return mime.startsWith('video/');
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

function timeAgo() {
  return 'Just now';
}

// ─── LinkedIn Preview ────────────────────────────────────────────
function LinkedInPreview({ caption, mediaFiles, account }: { caption: string; mediaFiles: MediaFile[]; account: Account }) {
  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      {/* Header */}
      <div className="p-3 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
          {account.accountName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{account.accountName}</p>
          <p className="text-xs text-gray-500">{timeAgo()} • 🌐</p>
        </div>
        <span className="text-blue-600 text-xs font-semibold">• • •</span>
      </div>
      {/* Caption */}
      <div className="px-3 pb-2">
        <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
          {truncate(caption, 300)}
          {caption.length > 300 && <span className="text-blue-600 text-xs ml-1 cursor-pointer">...see more</span>}
        </p>
      </div>
      {/* Media */}
      {mediaFiles.length > 0 && (
        <div className="border-t border-gray-200">
          {mediaFiles.length === 1 ? (
            isVideo(mediaFiles[0].mimeType) ? (
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <span className="text-4xl">▶</span>
              </div>
            ) : (
              <img src={mediaFiles[0].url} alt="" className="w-full max-h-80 object-cover" />
            )
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {mediaFiles.slice(0, 4).map((f, i) => (
                <div key={f.id} className="relative aspect-square bg-gray-100">
                  {isVideo(f.mimeType) ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white text-2xl">▶</div>
                  ) : (
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                  )}
                  {i === 3 && mediaFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                      +{mediaFiles.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Engagement bar */}
      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>👍 ❤️ 0</span>
        <span>0 comments • 0 reposts</span>
      </div>
      <div className="px-3 py-1.5 border-t border-gray-200 flex justify-around text-xs text-gray-600 font-medium">
        <span>👍 Like</span><span>💬 Comment</span><span>🔄 Repost</span><span>📤 Send</span>
      </div>
    </div>
  );
}

// ─── Facebook Preview ────────────────────────────────────────────
function FacebookPreview({ caption, mediaFiles, account }: { caption: string; mediaFiles: MediaFile[]; account: Account }) {
  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      <div className="p-3 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
          {account.accountName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{account.accountName}</p>
          <p className="text-xs text-gray-500">{timeAgo()} • 🌐</p>
        </div>
      </div>
      <div className="px-3 pb-2">
        <p className="text-sm text-gray-900 whitespace-pre-line">{truncate(caption, 500)}</p>
      </div>
      {mediaFiles.length > 0 && (
        <div>
          {mediaFiles.length === 1 ? (
            isVideo(mediaFiles[0].mimeType) ? (
              <div className="aspect-video bg-black flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"><span className="text-3xl text-white ml-1">▶</span></div>
              </div>
            ) : (
              <img src={mediaFiles[0].url} alt="" className="w-full max-h-96 object-cover" />
            )
          ) : (
            <div className={`grid gap-0.5 ${mediaFiles.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {mediaFiles.slice(0, 4).map((f, i) => (
                <div key={f.id} className={`relative ${i === 0 && mediaFiles.length === 3 ? 'col-span-2' : ''} aspect-square bg-gray-100`}>
                  {isVideo(f.mimeType) ? (
                    <div className="w-full h-full bg-black flex items-center justify-center text-white text-2xl">▶</div>
                  ) : (
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                  )}
                  {i === 3 && mediaFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                      +{mediaFiles.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>👍 0</span>
        <span>0 Comments  0 Shares</span>
      </div>
      <div className="px-3 py-1.5 border-t border-gray-200 flex justify-around text-xs text-gray-600 font-medium">
        <span>👍 Like</span><span>💬 Comment</span><span>↗️ Share</span>
      </div>
    </div>
  );
}

// ─── Instagram Preview ───────────────────────────────────────────
function InstagramPreview({ caption, mediaFiles, account }: { caption: string; mediaFiles: MediaFile[]; account: Account }) {
  const firstMedia = mediaFiles[0];
  return (
    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
      <div className="p-2.5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-700">
            {account.accountName.charAt(0).toUpperCase()}
          </div>
        </div>
        <p className="text-xs font-semibold text-gray-900">{account.handle || account.accountName}</p>
        <span className="ml-auto text-gray-400 text-sm">•••</span>
      </div>
      {/* Square media area */}
      <div className="aspect-square bg-gray-100 relative">
        {firstMedia ? (
          isVideo(firstMedia.mimeType) ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center"><span className="text-4xl text-white ml-1">▶</span></div>
            </div>
          ) : (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No media</div>
        )}
        {mediaFiles.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            1/{mediaFiles.length}
          </div>
        )}
      </div>
      {/* Action buttons */}
      <div className="px-3 py-2 flex items-center gap-3 text-lg">
        <span>♡</span><span>💬</span><span>📤</span>
        <span className="ml-auto">🔖</span>
      </div>
      {/* Likes */}
      <div className="px-3 text-xs font-semibold text-gray-900">0 likes</div>
      {/* Caption */}
      <div className="px-3 pb-3 pt-0.5">
        <p className="text-xs text-gray-900">
          <span className="font-semibold">{account.handle || account.accountName}</span>{' '}
          <span className="whitespace-pre-line">{truncate(caption, 150)}</span>
          {caption.length > 150 && <span className="text-gray-400 ml-1">...more</span>}
        </p>
      </div>
    </div>
  );
}

// ─── YouTube Shorts Preview ──────────────────────────────────────
function YouTubePreview({ caption, mediaFiles, account }: { caption: string; mediaFiles: MediaFile[]; account: Account }) {
  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden text-white relative" style={{ aspectRatio: '9/16', maxHeight: 400 }}>
      {/* Video background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
      {mediaFiles.length > 0 && !isVideo(mediaFiles[0].mimeType) && (
        <img src={mediaFiles[0].url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      {/* Play button center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
          <span className="text-2xl ml-0.5">▶</span>
        </div>
      </div>
      {/* Shorts badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1">
        <div className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Shorts</div>
      </div>
      {/* Right side actions */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4 text-xs">
        <div className="flex flex-col items-center"><span className="text-lg">👍</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">👎</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">💬</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">↗️</span><span>Share</span></div>
      </div>
      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-12">
        <p className="text-xs font-semibold mb-0.5">@{account.handle || account.accountName}</p>
        <p className="text-[11px] leading-tight opacity-90 line-clamp-2">{truncate(caption, 100)}</p>
      </div>
    </div>
  );
}

// ─── TikTok Preview ──────────────────────────────────────────────
function TikTokPreview({ caption, mediaFiles, account }: { caption: string; mediaFiles: MediaFile[]; account: Account }) {
  return (
    <div className="bg-black rounded-lg overflow-hidden text-white relative" style={{ aspectRatio: '9/16', maxHeight: 400 }}>
      {mediaFiles.length > 0 && !isVideo(mediaFiles[0].mimeType) && (
        <img src={mediaFiles[0].url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
      {/* Center play */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center">
          <span className="text-3xl ml-0.5">▶</span>
        </div>
      </div>
      {/* Right actions */}
      <div className="absolute right-2 bottom-28 flex flex-col items-center gap-4 text-xs">
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
          {account.accountName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col items-center"><span className="text-lg">❤️</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">💬</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">🔖</span><span>0</span></div>
        <div className="flex flex-col items-center"><span className="text-lg">↗️</span><span>Share</span></div>
      </div>
      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-14">
        <p className="text-xs font-semibold mb-0.5">@{account.handle || account.accountName}</p>
        <p className="text-[11px] leading-tight opacity-90 line-clamp-3">{truncate(caption, 150)}</p>
        {/* Music bar */}
        <div className="mt-2 flex items-center gap-1 text-[10px] opacity-70">
          <span>🎵</span>
          <span className="truncate">Original sound - {account.accountName}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Preview Grid ──────────────────────────────────────────
const PREVIEW_RENDERERS: Record<string, React.FC<{ caption: string; mediaFiles: MediaFile[]; account: Account }>> = {
  linkedin: LinkedInPreview,
  facebook: FacebookPreview,
  instagram: InstagramPreview,
  youtube: YouTubePreview,
  tiktok: TikTokPreview,
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-700',
  facebook: 'bg-blue-600',
  instagram: 'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600',
  youtube: 'bg-red-600',
  tiktok: 'bg-black',
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube Shorts',
  tiktok: 'TikTok',
};

export function PostPreview({ caption, mediaFiles, selectedAccounts }: PostPreviewProps) {
  if (selectedAccounts.length === 0 || !caption.trim()) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 border-dashed p-8 text-center">
        <p className="text-gray-400 text-sm">👁️ Select accounts and write a caption to preview your post</p>
      </div>
    );
  }

  // Group selected accounts by platform (show one preview per platform, pick first account)
  const platformAccounts = new Map<string, Account>();
  for (const acc of selectedAccounts) {
    if (!platformAccounts.has(acc.platform)) {
      platformAccounts.set(acc.platform, acc);
    }
  }

  const entries = Array.from(platformAccounts.entries());

  // Vertical layout for video-oriented platforms, horizontal for feed
  const feedPlatforms = entries.filter(([p]) => p === 'linkedin' || p === 'facebook');
  const squarePlatforms = entries.filter(([p]) => p === 'instagram');
  const verticalPlatforms = entries.filter(([p]) => p === 'youtube' || p === 'tiktok');

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        👁️ Post Preview
        <span className="text-xs font-normal text-gray-400">({entries.length} platform{entries.length !== 1 ? 's' : ''})</span>
      </h3>

      {/* Feed-style previews (LinkedIn, Facebook) */}
      {feedPlatforms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedPlatforms.map(([platform, account]) => {
            const Renderer = PREVIEW_RENDERERS[platform];
            return (
              <div key={platform}>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg text-white text-xs font-semibold ${PLATFORM_COLORS[platform]}`}>
                  {PLATFORM_LABELS[platform]}
                </div>
                <Renderer caption={caption} mediaFiles={mediaFiles} account={account} />
              </div>
            );
          })}
        </div>
      )}

      {/* Square preview (Instagram) */}
      {squarePlatforms.length > 0 && (
        <div className="max-w-sm">
          {squarePlatforms.map(([platform, account]) => {
            const Renderer = PREVIEW_RENDERERS[platform];
            return (
              <div key={platform}>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg text-white text-xs font-semibold ${PLATFORM_COLORS[platform]}`}>
                  {PLATFORM_LABELS[platform]}
                </div>
                <Renderer caption={caption} mediaFiles={mediaFiles} account={account} />
              </div>
            );
          })}
        </div>
      )}

      {/* Vertical previews (YouTube Shorts, TikTok) */}
      {verticalPlatforms.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {verticalPlatforms.map(([platform, account]) => {
            const Renderer = PREVIEW_RENDERERS[platform];
            return (
              <div key={platform} className="flex-shrink-0 w-56">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-t-lg text-white text-xs font-semibold ${PLATFORM_COLORS[platform]}`}>
                  {PLATFORM_LABELS[platform]}
                </div>
                <Renderer caption={caption} mediaFiles={mediaFiles} account={account} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
