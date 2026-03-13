import { useState } from 'react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgLight: string;
  description: string;
  permissions: string[];
  prerequisites?: string;
  approvalNote?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    bgLight: 'bg-blue-50 border-blue-200',
    description: 'Post to your personal profile and/or Company Pages',
    permissions: ['Create posts on your personal feed', 'Post to Company Pages you admin', 'Read your basic profile'],
    prerequisites: 'Company Page posting requires Marketing Developer Platform approval.',
    approvalNote: 'Personal profile posting works immediately.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50 border-blue-200',
    description: 'Post to Facebook Pages you manage',
    permissions: ['Manage and create posts on your Pages', 'Read Page engagement data'],
    prerequisites: 'You need to manage at least one Facebook Page.',
    approvalNote: 'App review may be required for public access.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'bg-pink-500',
    bgLight: 'bg-pink-50 border-pink-200',
    description: 'Publish photos and Reels to Instagram Business accounts',
    permissions: ['Publish content to your Instagram', 'Read your Instagram profile'],
    prerequisites: 'Requires an Instagram Business or Creator account linked to a Facebook Page.',
    approvalNote: 'Same Meta app review as Facebook.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🎬',
    color: 'bg-red-600',
    bgLight: 'bg-red-50 border-red-200',
    description: 'Upload YouTube Shorts to your channel',
    permissions: ['Upload videos to your channel', 'Read your channel info'],
    approvalNote: 'Works in test mode immediately. Public upload needs Google verification.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-gray-900',
    bgLight: 'bg-gray-50 border-gray-200',
    description: 'Post videos to TikTok',
    permissions: ['Upload and publish videos', 'Read your basic profile'],
    approvalNote: 'Unaudited apps post to drafts only. Public posting needs TikTok audit (2-6 weeks).',
  },
];

interface ConnectWizardProps {
  connectedPlatforms: Set<string>;
  onClose: () => void;
}

export function ConnectWizard({ connectedPlatforms, onClose }: ConnectWizardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(PLATFORMS.filter(p => !connectedPlatforms.has(p.id)).map(p => p.id))
  );
  const [connecting, setConnecting] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    if (connectedPlatforms.has(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startConnecting = () => {
    const toConnect = Array.from(selected).filter(id => !connectedPlatforms.has(id));
    if (toConnect.length === 0) return;

    // Start OAuth for the first selected platform
    // After it returns, the user will be back on /accounts and can continue
    setConnecting(true);
    setCurrentPlatform(toConnect[0]);
    window.location.href = `/auth/${toConnect[0]}/start`;
  };

  const unconnected = PLATFORMS.filter(p => !connectedPlatforms.has(p.id));
  const alreadyConnected = PLATFORMS.filter(p => connectedPlatforms.has(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">🔑 Connect Your Accounts</h2>
              <p className="text-sm opacity-90 mt-1">
                Select the platforms you want to connect. You&apos;ll authorize each one.
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {/* Already connected */}
          {alreadyConnected.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Already Connected</p>
              <div className="flex flex-wrap gap-2">
                {alreadyConnected.map(p => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {p.icon} {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Platforms to connect */}
          {unconnected.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-gray-600 font-medium">All platforms connected!</p>
              <p className="text-sm text-gray-400 mt-1">You're all set to start posting.</p>
            </div>
          ) : (
            unconnected.map(platform => {
              const isSelected = selected.has(platform.id);
              return (
                <label
                  key={platform.id}
                  className={`flex gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePlatform(platform.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{platform.icon}</span>
                      <span className="font-semibold text-gray-900">{platform.name}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{platform.description}</p>

                    {/* Permissions */}
                    <div className="mt-2 space-y-1">
                      {platform.permissions.map((perm, i) => (
                        <p key={i} className="text-xs text-gray-400 flex items-center gap-1.5">
                          <span className="text-green-500">✓</span> {perm}
                        </p>
                      ))}
                    </div>

                    {/* Prerequisites */}
                    {platform.prerequisites && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <span>⚠️</span> {platform.prerequisites}
                      </p>
                    )}

                    {/* Approval note */}
                    {platform.approvalNote && (
                      <p className="text-xs text-gray-400 mt-1 italic">{platform.approvalNote}</p>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        {unconnected.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {selected.size} platform{selected.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 py-2.5 px-4"
              >
                Skip for now
              </button>
              <button
                onClick={startConnecting}
                disabled={connecting || selected.size === 0}
                className="bg-indigo-600 text-white text-sm font-semibold py-2.5 px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {connecting
                  ? `⏳ Connecting ${currentPlatform}...`
                  : `Connect ${selected.size} Platform${selected.size !== 1 ? 's' : ''} →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
