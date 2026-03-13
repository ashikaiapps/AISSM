# SocialKeys.ai — Complete Implementation Plan

> **Last Updated:** June 2025
> **Architecture:** Node.js Monorepo (npm workspaces) · React 18+ · Express.js · SQLite · TypeScript
> **AI Stack:** GitHub Copilot SDK (Claude Opus 4.6) · Azure DALL-E 3 · Azure Sora 2

---

## Table of Contents

1. [Local Dev Quickstart](#local-dev-quickstart)
2. [Environment Variable Reference](#environment-variable-reference)
3. [Platform Registration Checklist](#platform-registration-checklist)
4. [UI/UX Wireframe Descriptions](#uiux-wireframe-descriptions)
5. [Phase 1: Foundation](#phase-1-foundation)
6. [Phase 2: Adapter Framework & Multi-Account](#phase-2-adapter-framework--multi-account)
7. [Phase 3: LinkedIn & Facebook Adapters](#phase-3-linkedin--facebook-adapters)
8. [Phase 4: Post Composer & Media Handling](#phase-4-post-composer--media-handling)
9. [Phase 5: Scheduling Engine](#phase-5-scheduling-engine)
10. [Phase 6: Instagram, YouTube Shorts, TikTok Adapters](#phase-6-instagram-youtube-shorts-tiktok-adapters)
11. [Phase 7: AI Text Content (Copilot SDK)](#phase-7-ai-text-content-copilot-sdk)
12. [Phase 8: AI Content Planner & Campaigns](#phase-8-ai-content-planner--campaigns)
13. [Phase 9: Analytics Dashboard](#phase-9-analytics-dashboard)
14. [Phase 10: Electron Desktop App](#phase-10-electron-desktop-app)
15. [Phase 11: AI Image Generation (DALL-E 3)](#phase-11-ai-image-generation-dall-e-3)
16. [Phase 12: AI Video Generation (Sora 2)](#phase-12-ai-video-generation-sora-2)
17. [Phase 13: Polish & Hardening](#phase-13-polish--hardening)

---

## Local Dev Quickstart

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 LTS | `winget install OpenJS.NodeJS.LTS` |
| npm | ≥ 10 | Ships with Node.js 20+ |
| Git | Latest | `winget install Git.Git` |
| VS Code | Latest | `winget install Microsoft.VisualStudio.Code` |
| GitHub Copilot CLI | Latest | `npm install -g @github/copilot-cli` |

### Clone → Running in 5 Minutes

```bash
# 1. Clone the repo
git clone https://github.com/AshikOS/SocialKeys.ai.git
cd SocialKeys.ai

# 2. Install all workspace dependencies (single command)
npm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your API keys (see Environment Variable Reference below)

# 4. Initialize the database
npm run db:push -w packages/database

# 5. Seed with demo data (optional)
npm run db:seed -w packages/database

# 6. Start everything in development mode (frontend + backend concurrently)
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# API docs: http://localhost:3001/api-docs
```

### Monorepo Structure (Final)

```
SocialKeys.ai/
├── package.json                    # Root workspace config
├── .env.example                    # All env vars template
├── .env                            # Local env (gitignored)
├── tsconfig.base.json              # Shared TS config
├── turbo.json                      # Turborepo config (optional)
├── apps/
│   ├── web/                        # React frontend (Vite)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── router.tsx
│   │       ├── components/         # Shared UI components
│   │       │   ├── ui/             # Primitives (Button, Input, etc.)
│   │       │   ├── layout/         # Shell, Sidebar, Header
│   │       │   ├── composer/       # Post composer components
│   │       │   ├── accounts/       # Account management
│   │       │   ├── campaigns/      # Campaign planner
│   │       │   └── analytics/      # Dashboard charts
│   │       ├── hooks/              # Custom React hooks
│   │       ├── lib/                # API client, utilities
│   │       ├── stores/             # Zustand stores
│   │       ├── pages/              # Route pages
│   │       └── types/              # Frontend-specific types
│   ├── server/                     # Express backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # Server entry
│   │   │   ├── app.ts              # Express app factory
│   │   │   ├── routes/             # Route handlers
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── accounts.routes.ts
│   │   │   │   ├── posts.routes.ts
│   │   │   │   ├── campaigns.routes.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   └── ai.routes.ts
│   │   │   ├── middleware/         # Auth, validation, error handling
│   │   │   ├── services/           # Business logic layer
│   │   │   ├── adapters/           # Platform adapters
│   │   │   │   ├── base.adapter.ts
│   │   │   │   ├── linkedin.adapter.ts
│   │   │   │   ├── facebook.adapter.ts
│   │   │   │   ├── instagram.adapter.ts
│   │   │   │   ├── youtube.adapter.ts
│   │   │   │   └── tiktok.adapter.ts
│   │   │   ├── scheduler/          # Cron + queue
│   │   │   ├── ai/                 # AI service wrappers
│   │   │   └── lib/                # Shared server utilities
│   │   └── tests/
│   └── desktop/                    # Electron app (Phase 10)
│       ├── package.json
│       ├── electron.ts
│       └── preload.ts
├── packages/
│   ├── database/                   # Drizzle schema + migrations
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── index.ts            # DB connection export
│   │   │   ├── schema/             # Table definitions
│   │   │   │   ├── users.ts
│   │   │   │   ├── accounts.ts
│   │   │   │   ├── posts.ts
│   │   │   │   ├── campaigns.ts
│   │   │   │   ├── media.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   └── index.ts        # Re-exports
│   │   │   ├── seed.ts
│   │   │   └── migrate.ts
│   │   └── drizzle/                # Generated migrations
│   ├── shared/                     # Shared types, utils, constants
│   │   ├── package.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── platform.types.ts
│   │       │   ├── post.types.ts
│   │       │   ├── campaign.types.ts
│   │       │   └── api.types.ts
│   │       ├── constants/
│   │       │   ├── platforms.ts
│   │       │   └── limits.ts
│   │       └── utils/
│   │           ├── validation.ts
│   │           └── formatting.ts
│   └── ui/                         # Shared UI component library (optional)
│       ├── package.json
│       └── src/
└── scripts/                        # Dev/build/deploy scripts
    ├── setup.ts
    └── reset-db.ts
```

---

## Environment Variable Reference

Create `.env.example` at the project root with ALL variables across all phases:

```env
# ============================================================
# SocialKeys.ai — Environment Variables
# Copy this file to .env and fill in your values
# ============================================================

# ── General ──────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
SESSION_SECRET=generate-a-random-64-char-string-here
ENCRYPTION_KEY=generate-a-random-32-byte-hex-string-here

# ── Database ─────────────────────────────────────────────────
DATABASE_URL=./data/socialkeys.db

# ── Auth / JWT ───────────────────────────────────────────────
JWT_SECRET=generate-a-random-64-char-string-here
JWT_EXPIRY=7d

# ── LinkedIn (Phase 3) ──────────────────────────────────────
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3001/api/auth/linkedin/callback
# Scopes: openid profile w_member_social r_liteprofile

# ── Facebook / Meta (Phase 3) ───────────────────────────────
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=http://localhost:3001/api/auth/facebook/callback
# Scopes: pages_manage_posts pages_read_engagement pages_show_list

# ── Instagram (Phase 6) — Uses Facebook/Meta app ────────────
INSTAGRAM_REDIRECT_URI=http://localhost:3001/api/auth/instagram/callback
# Scopes: instagram_basic instagram_content_publish pages_show_list pages_read_engagement

# ── YouTube / Google (Phase 6) ──────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
# Scopes: https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly

# ── TikTok (Phase 6) ────────────────────────────────────────
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3001/api/auth/tiktok/callback
# Scopes: user.info.basic video.publish video.upload video.list

# ── GitHub Copilot SDK / AI Text (Phase 7) ──────────────────
GITHUB_TOKEN=
COPILOT_MODEL=claude-opus-4.6
# The @github/copilot-sdk authenticates via GitHub token or Copilot CLI auth

# ── Azure OpenAI — DALL-E 3 (Phase 11) ─────────────────────
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_DALLE_DEPLOYMENT=dall-e-3
AZURE_OPENAI_API_VERSION=2024-06-01

# ── Azure AI Foundry — Sora 2 (Phase 12) ────────────────────
AZURE_SORA_ENDPOINT=https://<your-foundry>.api.azureml.ms
AZURE_SORA_API_KEY=
AZURE_SORA_DEPLOYMENT=sora-2

# ── Media Storage ────────────────────────────────────────────
UPLOAD_DIR=./data/uploads
MAX_FILE_SIZE_MB=100
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/quicktime,video/webm

# ── Scheduling ───────────────────────────────────────────────
SCHEDULER_ENABLED=true
SCHEDULER_POLL_INTERVAL_MS=30000
SCHEDULER_MAX_RETRIES=3
SCHEDULER_RETRY_DELAY_MS=60000

# ── Rate Limiting ────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Platform Registration Checklist

### 1. LinkedIn

| Item | Details |
|------|---------|
| **Portal URL** | https://www.linkedin.com/developers/ |
| **Steps** | 1. Sign in → "Create App" → Fill app name, LinkedIn Page, logo, privacy policy URL |
|  | 2. Under Products tab → Request "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" |
|  | 3. Under Auth tab → Add redirect URL: `http://localhost:3001/api/auth/linkedin/callback` |
|  | 4. Copy Client ID and Client Secret to `.env` |
| **Required Scopes** | `openid`, `profile`, `email`, `w_member_social` |
| **For Org Posting** | Apply for "Marketing Developer Platform" (requires LinkedIn rep review, 2-4 weeks) |
| **Test Mode** | You can test with your own LinkedIn account immediately in development mode |
| **Rate Limits** | 100 requests/day for Share API (member context); 1000/day for org context |
| **Approval Timeline** | Instant for personal posting; 2-4 weeks for org/marketing APIs |
| **Token Lifetime** | Access token: 60 days. Refresh token: 365 days |

### 2. Facebook (Meta)

| Item | Details |
|------|---------|
| **Portal URL** | https://developers.facebook.com/ |
| **Steps** | 1. Create Meta Developer account → "Create App" → Choose "Business" type |
|  | 2. Add "Facebook Login for Business" product |
|  | 3. Settings → Basic: Copy App ID and App Secret |
|  | 4. Facebook Login → Settings: Add redirect URI, set "Client OAuth Login" ON |
|  | 5. Under Permissions: Request `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` |
| **Required Scopes** | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `public_profile` |
| **Test Mode** | In development mode, only app admins/testers can use it — add test users under Roles |
| **Rate Limits** | 200 calls/user/hour for Pages API; 4800 calls/day for app-level |
| **Approval Timeline** | App Review required for public use (1-5 business days); dev mode is instant |
| **API Version** | v21.0 (latest stable as of 2025) |
| **Token Lifetime** | Short-lived: 1 hour. Long-lived: 60 days. Page tokens can be permanent |
| **Important Note** | Group posting via API is **deprecated** (v19+). Only Page posting is supported |

### 3. Instagram (via Meta Graph API)

| Item | Details |
|------|---------|
| **Portal URL** | Same Facebook/Meta app — https://developers.facebook.com/ |
| **Steps** | 1. In your existing Meta app → Add "Instagram Graph API" product |
|  | 2. Ensure Instagram Business Account is linked to a Facebook Page |
|  | 3. Request permissions: `instagram_basic`, `instagram_content_publish` |
|  | 4. Content Publishing requires Business Account (not Personal or Creator for full API) |
| **Required Scopes** | `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` |
| **Limitations** | JPEG only for images; max 25 API posts/account/24hrs; no Stories via API; no filters/shopping tags |
| **Rate Limits** | 200 calls/user/hour; 25 content publishes per 24 hours per account |
| **Approval Timeline** | Same as Facebook — App Review 1-5 business days for public |
| **Two-Step Publish** | 1. Create media container → 2. Publish container (async for video) |

### 4. YouTube (Google Cloud)

| Item | Details |
|------|---------|
| **Portal URL** | https://console.cloud.google.com/ |
| **Steps** | 1. Create project → Enable "YouTube Data API v3" |
|  | 2. Credentials → Create OAuth 2.0 Client ID (Web application) |
|  | 3. Add redirect URI: `http://localhost:3001/api/auth/google/callback` |
|  | 4. Configure OAuth consent screen (External, Testing mode) |
|  | 5. Add test users (up to 100 in testing mode) |
| **Required Scopes** | `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly` |
| **Quota** | Default: 10,000 units/day. Upload (videos.insert) = 1,600 units = **max 6 uploads/day** |
| **Quota Increase** | Apply via support form + compliance audit. Non-trivial approval process |
| **Shorts** | No separate endpoint — upload vertical video < 60s via standard `videos.insert` |
| **Rate Limits** | Quota-based, not request-based. Each operation has a unit cost |
| **Approval Timeline** | OAuth consent screen verification: 2-4 weeks for production (instant for test mode with ≤100 users) |
| **Token Lifetime** | Access token: 1 hour. Refresh token: no expiry (unless revoked) |

### 5. TikTok

| Item | Details |
|------|---------|
| **Portal URL** | https://developers.tiktok.com/ |
| **Steps** | 1. Create developer account → Create app |
|  | 2. Select "Content Posting API" product |
|  | 3. Configure redirect URI: `http://localhost:3001/api/auth/tiktok/callback` |
|  | 4. Request scopes: `user.info.basic`, `video.publish`, `video.upload` |
|  | 5. Submit for TikTok app review |
| **Required Scopes** | `user.info.basic`, `video.publish`, `video.upload`, `video.list` |
| **Test Mode** | Sandbox mode available — videos posted are private until audit passes |
| **Rate Limits** | Varies by scope; generally generous for content posting |
| **Approval Timeline** | App review: 1-3 weeks. Stricter than most — demonstrate legitimate use case |
| **Important** | Videos may be private until TikTok completes audit of your app |
| **Token Lifetime** | Access token: 24 hours. Refresh token: 365 days |

---

## UI/UX Wireframe Descriptions

### Screen 1: Dashboard (Home)

```
┌─────────────────────────────────────────────────────────────────┐
│  🔑 SocialKeys.ai                    [🔔] [👤 Profile ▾]       │
├────────┬────────────────────────────────────────────────────────┤
│        │                                                        │
│  📊    │  DASHBOARD                                             │
│  Home  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│        │  │ 5 Accts  │ │ 12 Posts │ │ 3 Sched  │ │ 2 Camps  │  │
│  ✏️    │  │ Connected│ │ This Week│ │ Pending  │ │ Active   │  │
│ Compose│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│        │                                                        │
│  📅    │  UPCOMING SCHEDULED POSTS                              │
│Calendar│  ┌────────────────────────────────────────────────┐    │
│        │  │ 📋 "Q3 Product Launch" → LinkedIn, Facebook    │    │
│  🔗    │  │    Tomorrow 9:00 AM  · Campaign: Q3 Launch     │    │
│Accounts│  ├────────────────────────────────────────────────┤    │
│        │  │ 📋 "Behind the scenes" → Instagram, TikTok     │    │
│  📊    │  │    Thu 2:00 PM · Campaign: Brand Building      │    │
│Analytics│ └────────────────────────────────────────────────┘    │
│        │                                                        │
│  🤖    │  RECENT ACTIVITY                                       │
│   AI   │  ✅ "Team Friday" posted to LinkedIn · 2 hrs ago       │
│        │  ❌ "Summer Sale" failed on Instagram · retry available │
│  ⚙️    │  ✅ "Tutorial #5" posted to YouTube · 5 hrs ago        │
│Settings│                                                        │
└────────┴────────────────────────────────────────────────────────┘
```

**Design notes:**
- Sidebar: fixed 240px on desktop, collapsible hamburger on mobile
- Stats cards: use subtle gradients per metric, animate count on mount
- Scheduled list: sorted by soonest first, max 5 shown with "View all" link
- Activity feed: real-time updates via polling (future: WebSocket)
- Empty state: friendly illustration + "Connect your first account" CTA
- Dark mode support from day one (Tailwind `dark:` variants)

### Screen 2: Post Composer

```
┌────────────────────────────────────────────────────────────────┐
│  COMPOSE POST                                    [💾 Draft] [→ Post]
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT ACCOUNTS                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ☑ 🔵 LinkedIn · John Doe        [Personal]            │    │
│  │ ☑ 🔵 Facebook · AshikOS Page    [Page]                │    │
│  │ ☐ 📷 Instagram · @ashikos       [Business]            │    │
│  │ ☐ 🎵 TikTok · @ashikos          [Creator]             │    │
│  │ ☐ ▶️ YouTube · AshikOS Channel   [Channel]             │    │
│  │                               [+ Connect Account]      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  CONTENT                                                       │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Write your post here...                                │    │
│  │                                                        │    │
│  │                                                        │    │
│  │                                                        │    │
│  │ ──────────────────────────────────────────────────── │    │
│  │ 📎 Media  🤖 AI Write  😀 Emoji  #️⃣ Hashtags         │    │
│  │ Characters: 0/3000 (LinkedIn) · 0/63,206 (Facebook)   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──── PLATFORM PREVIEWS ────────────────────────────────┐    │
│  │  [LinkedIn] [Facebook] [Instagram] [TikTok] [YouTube] │    │
│  │  ┌──────────────────────────────────────┐             │    │
│  │  │  ┌──┐ John Doe · 1st                │             │    │
│  │  │  │🧑│ Just now · 🌐                  │             │    │
│  │  │  └──┘                                │             │    │
│  │  │  Your post preview renders here...   │             │    │
│  │  │                                      │             │    │
│  │  │  👍 Like  💬 Comment  🔁 Repost       │             │    │
│  │  └──────────────────────────────────────┘             │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  SCHEDULING                                                    │
│  ◉ Post now  ○ Schedule for: [📅 Date] [🕐 Time] [🌍 TZ]     │
│                                                                │
│  CAMPAIGN (optional)                                           │
│  [ Select campaign ▾ ]  or  [+ Create new]                     │
│                                                                │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │   💾 Save as Draft   │  │   📤 Post / Schedule  │           │
│  └──────────────────────┘  └──────────────────────┘           │
└────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- Account selector: checkboxes with platform icon + color coding
- Textarea: auto-expanding, supports markdown preview
- Character counter: changes color (green → yellow → red) as limit approaches per platform
- Media upload: drag-and-drop zone, image/video preview thumbnails, reorder capability
- AI Write button: opens slide-out panel with prompt input, tone selector, length options
- Platform previews: tab-based, pixel-accurate mockups of how post will look
- Scheduling: date/time picker with timezone dropdown, suggested optimal times
- Loading state: skeleton screens while posting
- Error state: inline red banner with specific error + retry button per platform

### Screen 3: Account Manager

```
┌────────────────────────────────────────────────────────────────┐
│  CONNECTED ACCOUNTS                       [+ Connect Account]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  LINKEDIN (1 account)                                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  🔵 John Doe · Personal Account                       │    │
│  │  Connected: Jan 15, 2025 · Token expires: Mar 15, 2025│    │
│  │  Status: ✅ Active                                     │    │
│  │  [🔄 Refresh Token]  [⚙️ Settings]  [🗑️ Disconnect]    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  INSTAGRAM (2 accounts)                                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  📷 @ashikos_main · Business Account                   │    │
│  │  Connected: Feb 1, 2025 · Token expires: Apr 1, 2025  │    │
│  │  Status: ✅ Active                                     │    │
│  │  [🔄 Refresh Token]  [⚙️ Settings]  [🗑️ Disconnect]    │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │  📷 @ashikos_brand · Business Account                  │    │
│  │  Connected: Feb 1, 2025 · Token expires: N/A          │    │
│  │  Status: ⚠️ Token Expired — Click to reconnect         │    │
│  │  [🔄 Reconnect]  [⚙️ Settings]  [🗑️ Disconnect]       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                │
│  ── Not Connected ────────────────────────────────────────     │
│  [+ Connect Facebook]  [+ Connect YouTube]  [+ Connect TikTok]│
└────────────────────────────────────────────────────────────────┘
```

**Design notes:**
- Group by platform, show count per platform
- Token expiry warning: yellow badge when < 7 days, red when expired
- Reconnect flow: same OAuth flow, preserves account history
- Multi-account: each platform section can have multiple account cards
- "Connect Account" button: opens modal with platform grid (icons + descriptions)
- Empty state per platform: subtle card with "Connect your [Platform] account to start posting"

### Screen 4: Campaign Planner

```
┌────────────────────────────────────────────────────────────────┐
│  CAMPAIGNS                [📅 Calendar View] [📋 List View]    │
│                                               [+ New Campaign] │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─ ACTIVE CAMPAIGNS ──────────────────────────────────────┐   │
│  │                                                          │   │
│  │  📁 Q3 Product Launch                                    │   │
│  │  Jul 1 - Sep 30, 2025 · 12 posts (4 published, 8 sched)│   │
│  │  Platforms: LinkedIn, Facebook, Instagram                │   │
│  │  Progress: ████████░░░░ 33%                              │   │
│  │  [View] [Edit] [🤖 AI Suggest Posts]                     │   │
│  │                                                          │   │
│  │  📁 Brand Building                                       │   │
│  │  Ongoing · 24 posts (20 published, 4 scheduled)         │   │
│  │  Platforms: All                                          │   │
│  │  [View] [Edit] [🤖 AI Suggest Posts]                     │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ CALENDAR VIEW ──────────────────────────────────────────┐  │
│  │       Mon    Tue    Wed    Thu    Fri    Sat    Sun      │  │
│  │  W27  ·      🔵     ·      📷🔵   ·      ·      ·       │  │
│  │  W28  🔵     ·      📷     🎵     ·      ·      ·       │  │
│  │  W29  🔵📷   ·      ·      🔵     📷🎵   ·      ·       │  │
│  │                                                          │  │
│  │  🔵=LinkedIn  📷=Instagram  🎵=TikTok  ▶️=YouTube        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Screen 5: Analytics Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  ANALYTICS            [Last 7 days ▾] [All Platforms ▾]        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ 45.2K    │ │ 1,234    │ │ 89       │ │ 3.2%     │         │
│  │Impressions│ │Engagements│ │ Clicks   │ │Eng. Rate │         │
│  │ ↑ 12%    │ │ ↑ 8%     │ │ ↓ 3%    │ │ ↑ 1.5%  │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│                                                                │
│  ┌─ ENGAGEMENT OVER TIME ──────────────────────────────────┐   │
│  │  📈 [Line chart: 7-day engagement trend per platform]   │   │
│  │      LinkedIn ── Facebook -- Instagram ·· TikTok        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ TOP PERFORMING POSTS ──────────────────────────────────┐   │
│  │  1. "Q3 Launch Announcement" · LinkedIn · 12K views     │   │
│  │  2. "Behind the Scenes" · Instagram · 8.5K likes        │   │
│  │  3. "Tutorial #5" · YouTube · 2.1K views                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ PLATFORM BREAKDOWN ─────┐ ┌─ BEST POSTING TIMES ──────┐   │
│  │  🔵 LinkedIn    40%      │ │  Mon 9:00 AM  ████████    │   │
│  │  🔵 Facebook    25%      │ │  Wed 12:00 PM ███████     │   │
│  │  📷 Instagram   20%      │ │  Fri 3:00 PM  ██████      │   │
│  │  🎵 TikTok     10%      │ │  Tue 7:00 PM  █████       │   │
│  │  ▶️ YouTube      5%      │ │                            │   │
│  └───────────────────────────┘ └────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation

**Goal:** Set up the monorepo, TypeScript, React frontend, Express backend, SQLite database, and development tooling.

**Estimated Time:** 2-3 days

### Step 1.1: Initialize the Monorepo

```bash
# Create the project root
mkdir SocialKeys.ai && cd SocialKeys.ai
git init

# Create root package.json with workspaces
npm init -y
```

Edit `package.json`:

```json
{
  "name": "socialkeys-ai",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently -n web,server -c blue,green \"npm run dev -w apps/web\" \"npm run dev -w apps/server\"",
    "build": "npm run build -w packages/shared && npm run build -w packages/database && npm run build -w apps/web && npm run build -w apps/server",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit -p apps/web/tsconfig.json && tsc --noEmit -p apps/server/tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:push": "npm run db:push -w packages/database",
    "db:generate": "npm run db:generate -w packages/database",
    "db:migrate": "npm run db:migrate -w packages/database",
    "db:seed": "npm run db:seed -w packages/database",
    "db:studio": "npm run db:studio -w packages/database",
    "clean": "rimraf apps/*/dist packages/*/dist node_modules"
  },
  "devDependencies": {
    "concurrently": "^9.1.0",
    "rimraf": "^6.0.0",
    "typescript": "^5.7.0"
  }
}
```

### Step 1.2: Shared TypeScript Config

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@socialkeys/shared": ["../../packages/shared/src"],
      "@socialkeys/database": ["../../packages/database/src"]
    }
  },
  "exclude": ["node_modules", "dist"]
}
```

### Step 1.3: Create Directory Structure

```bash
# Create all directories
mkdir -p apps/web/src/{components/{ui,layout,composer,accounts,campaigns,analytics},hooks,lib,stores,pages,types}
mkdir -p apps/server/src/{routes,middleware,services,adapters,scheduler,ai,lib}
mkdir -p apps/server/tests
mkdir -p packages/database/src/schema
mkdir -p packages/database/drizzle
mkdir -p packages/shared/src/{types,constants,utils}
mkdir -p scripts
mkdir -p data/uploads
```

### Step 1.4: Shared Package (`packages/shared`)

`packages/shared/package.json`:

```json
{
  "name": "@socialkeys/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts",
    "./utils": "./src/utils/index.ts"
  }
}
```

`packages/shared/src/types/platform.types.ts`:

```typescript
export type PlatformType = 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export interface PlatformAccount {
  id: string;
  platform: PlatformType;
  platformAccountId: string;
  displayName: string;
  profileImageUrl?: string;
  accountType: 'personal' | 'page' | 'business' | 'creator' | 'channel';
  accessToken: string;           // encrypted at rest
  refreshToken?: string;         // encrypted at rest
  tokenExpiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformConfig {
  platform: PlatformType;
  displayName: string;
  icon: string;
  color: string;
  maxTextLength: number;
  supportedMediaTypes: ('image' | 'video' | 'gif' | 'carousel')[];
  maxImages: number;
  maxVideoLengthSeconds: number;
  maxVideoSizeMB: number;
  supportsScheduling: boolean;
  requiresBusinessAccount: boolean;
}

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformConfig> = {
  linkedin: {
    platform: 'linkedin',
    displayName: 'LinkedIn',
    icon: '🔵',
    color: '#0A66C2',
    maxTextLength: 3000,
    supportedMediaTypes: ['image', 'video'],
    maxImages: 9,
    maxVideoLengthSeconds: 600,
    maxVideoSizeMB: 200,
    supportsScheduling: false,   // scheduling is handled on our side
    requiresBusinessAccount: false,
  },
  facebook: {
    platform: 'facebook',
    displayName: 'Facebook',
    icon: '🔵',
    color: '#1877F2',
    maxTextLength: 63206,
    supportedMediaTypes: ['image', 'video', 'gif'],
    maxImages: 10,
    maxVideoLengthSeconds: 14400,
    maxVideoSizeMB: 4096,
    supportsScheduling: true,    // native scheduling available
    requiresBusinessAccount: false,
  },
  instagram: {
    platform: 'instagram',
    displayName: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    maxTextLength: 2200,
    supportedMediaTypes: ['image', 'video', 'carousel'],
    maxImages: 10,
    maxVideoLengthSeconds: 90,
    maxVideoSizeMB: 100,
    supportsScheduling: false,
    requiresBusinessAccount: true,
  },
  youtube: {
    platform: 'youtube',
    displayName: 'YouTube',
    icon: '▶️',
    color: '#FF0000',
    maxTextLength: 5000,
    supportedMediaTypes: ['video'],
    maxImages: 0,
    maxVideoLengthSeconds: 60,   // Shorts only for this app
    maxVideoSizeMB: 256,
    supportsScheduling: true,    // native scheduling available
    requiresBusinessAccount: false,
  },
  tiktok: {
    platform: 'tiktok',
    displayName: 'TikTok',
    icon: '🎵',
    color: '#000000',
    maxTextLength: 2200,
    supportedMediaTypes: ['video'],
    maxImages: 0,
    maxVideoLengthSeconds: 180,
    maxVideoSizeMB: 287,
    supportsScheduling: false,
    requiresBusinessAccount: false,
  },
};
```

`packages/shared/src/types/post.types.ts`:

```typescript
import type { PlatformType } from './platform.types';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'partial';

export interface PostTarget {
  accountId: string;
  platform: PlatformType;
  status: PostStatus;
  platformPostId?: string;
  publishedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  targets: PostTarget[];
  scheduledAt?: Date;
  campaignId?: string;
  status: PostStatus;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostRequest {
  content: string;
  mediaFiles?: File[];
  targetAccountIds: string[];
  scheduledAt?: string;        // ISO 8601
  campaignId?: string;
  publishNow: boolean;
}
```

`packages/shared/src/types/campaign.types.ts`:

```typescript
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: CampaignStatus;
  tags: string[];
  color: string;               // for calendar UI
  postCount: number;
  publishedCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

`packages/shared/src/index.ts`:

```typescript
export * from './types/platform.types';
export * from './types/post.types';
export * from './types/campaign.types';
export * from './constants/index';
export * from './utils/index';
```

### Step 1.5: Database Package (`packages/database`)

```bash
cd packages/database
npm init -y
```

`packages/database/package.json`:

```json
{
  "name": "@socialkeys/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "better-sqlite3": "^11.7.0",
    "drizzle-orm": "^0.44.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0"
  }
}
```

`packages/database/drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || '../../data/socialkeys.db',
  },
});
```

### Step 1.6: Database Schema (Drizzle)

`packages/database/src/schema/users.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

`packages/database/src/schema/accounts.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform', {
    enum: ['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'],
  }).notNull(),
  platformAccountId: text('platform_account_id').notNull(),
  displayName: text('display_name').notNull(),
  profileImageUrl: text('profile_image_url'),
  accountType: text('account_type', {
    enum: ['personal', 'page', 'business', 'creator', 'channel'],
  }).notNull().default('personal'),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: text('token_expires_at'),
  scopes: text('scopes'),           // JSON array of granted scopes
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata'),        // JSON — platform-specific data (page ID, org URN, etc.)
  lastSyncAt: text('last_sync_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

`packages/database/src/schema/posts.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { campaigns } from './campaigns';

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull().default(''),
  status: text('status', {
    enum: ['draft', 'scheduled', 'publishing', 'published', 'failed', 'partial'],
  }).notNull().default('draft'),
  scheduledAt: text('scheduled_at'),
  campaignId: text('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).notNull().default(false),
  aiPrompt: text('ai_prompt'),        // original prompt if AI-generated
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const postTargets = sqliteTable('post_targets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  platform: text('platform', {
    enum: ['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'],
  }).notNull(),
  status: text('status', {
    enum: ['pending', 'publishing', 'published', 'failed'],
  }).notNull().default('pending'),
  platformPostId: text('platform_post_id'),
  platformPostUrl: text('platform_post_url'),
  publishedAt: text('published_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  lastRetryAt: text('last_retry_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

import { accounts } from './accounts';
```

`packages/database/src/schema/media.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { posts } from './posts';

export const media = sqliteTable('media', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['image', 'video', 'gif'] }).notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  durationSeconds: integer('duration_seconds'),   // for video
  altText: text('alt_text'),                       // accessibility
  sortOrder: integer('sort_order').notNull().default(0),
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).notNull().default(false),
  aiPrompt: text('ai_prompt'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

`packages/database/src/schema/campaigns.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

export const campaigns = sqliteTable('campaigns', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status', {
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
  }).notNull().default('draft'),
  tags: text('tags'),                  // JSON array
  color: text('color').notNull().default('#6366f1'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});
```

`packages/database/src/schema/analytics.ts`:

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { postTargets } from './posts';

export const analyticsSnapshots = sqliteTable('analytics_snapshots', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postTargetId: text('post_target_id').notNull().references(() => postTargets.id, { onDelete: 'cascade' }),
  impressions: integer('impressions').default(0),
  reach: integer('reach').default(0),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),
  clicks: integer('clicks').default(0),
  saves: integer('saves').default(0),
  videoViews: integer('video_views').default(0),
  engagementRate: real('engagement_rate').default(0),
  snapshotAt: text('snapshot_at').notNull().default(sql`(datetime('now'))`),
});
```

`packages/database/src/schema/index.ts`:

```typescript
export { users } from './users';
export { accounts } from './accounts';
export { posts, postTargets } from './posts';
export { media } from './media';
export { campaigns } from './campaigns';
export { analyticsSnapshots } from './analytics';
```

`packages/database/src/index.ts`:

```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index';
import { resolve } from 'path';

const dbPath = process.env.DATABASE_URL || resolve(process.cwd(), 'data/socialkeys.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;
export * from './schema/index';
```

### Step 1.7: React Frontend (`apps/web`)

```bash
# From project root — scaffold with Vite
npm create vite@latest apps/web -- --template react-ts

# Install frontend dependencies
cd apps/web
npm install react-router-dom@^7 @tanstack/react-query@^5 zustand@^5 axios@^1
npm install -D tailwindcss@^4 @tailwindcss/vite@^4 autoprefixer
npm install lucide-react clsx tailwind-merge
npm install date-fns zod react-hook-form @hookform/resolvers
npm install react-dropzone react-hot-toast
```

`apps/web/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

`apps/web/src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 minute
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

`apps/web/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ComposePage } from './pages/ComposePage';
import { AccountsPage } from './pages/AccountsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="compose" element={<ComposePage />} />
        <Route path="compose/:postId" element={<ComposePage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:campaignId" element={<CampaignsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### Step 1.8: Express Backend (`apps/server`)

```bash
cd apps/server
npm init -y
npm install express cors helmet morgan cookie-parser dotenv
npm install zod express-rate-limit
npm install bcryptjs jsonwebtoken
npm install -D @types/express @types/cors @types/morgan @types/cookie-parser
npm install -D @types/bcryptjs @types/jsonwebtoken
npm install -D vitest supertest @types/supertest tsx nodemon
```

`apps/server/package.json` scripts:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`apps/server/src/app.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { accountRoutes } from './routes/accounts.routes';
import { postRoutes } from './routes/posts.routes';
import { campaignRoutes } from './routes/campaigns.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { aiRoutes } from './routes/ai.routes';

export function createApp() {
  const app = express();

  // Security & parsing
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use(morgan('dev'));

  // Rate limiting
  app.use(rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/ai', aiRoutes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
```

`apps/server/src/index.ts`:

```typescript
import 'dotenv/config';
import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🔑 SocialKeys.ai server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

`apps/server/src/middleware/error.middleware.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: (err as any).errors,
      },
    });
  }

  // Generic 500
  return res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      code: 'INTERNAL_ERROR',
    },
  });
}
```

### Step 1.9: Testing Setup

`vitest.config.ts` (root):

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/*/tests/**/*.test.ts', 'packages/*/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/*/src/**', 'packages/*/src/**'],
    },
  },
  resolve: {
    alias: {
      '@socialkeys/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@socialkeys/database': path.resolve(__dirname, 'packages/database/src'),
    },
  },
});
```

**Phase 1 Test Checklist:**
- [ ] `packages/database` — schema can create tables, insert, select
- [ ] `apps/server` — health endpoint returns 200
- [ ] `apps/server` — error middleware formats errors correctly
- [ ] `apps/web` — App component renders without crashing
- [ ] Root `npm run dev` starts both frontend and backend

### Step 1.10: Git Setup

```bash
# .gitignore
cat << 'EOF' > .gitignore
node_modules/
dist/
.env
*.db
*.db-journal
*.db-wal
data/uploads/*
!data/uploads/.gitkeep
.DS_Store
*.log
coverage/
.vscode/settings.json
EOF

# Initial commit
git add .
git commit -m "feat: Phase 1 — monorepo foundation with React, Express, SQLite

- npm workspaces monorepo (apps/web, apps/server, packages/database, packages/shared)
- React 18 + Vite + TailwindCSS frontend
- Express.js backend with health check
- SQLite via better-sqlite3 + Drizzle ORM
- Full database schema: users, accounts, posts, post_targets, media, campaigns, analytics
- Shared types package with platform configs
- Error handling middleware
- Vitest test configuration

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Phase 1: Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| SQLite file not found | Auto-create directory + file on first connection |
| Port already in use | Catch EADDRINUSE, log helpful message with alternate port suggestion |
| Missing .env file | Graceful defaults for all values, warn in console |
| Database migration conflict | Drizzle push with `--verbose` flag, manual resolution guide |
| npm workspace install failures | Clean node_modules and reinstall: `npm run clean && npm install` |

---

## Phase 2: Adapter Framework & Multi-Account

**Goal:** Build the platform adapter pattern, OAuth flows, token encryption, and multi-account management.

**Estimated Time:** 3-4 days

### Step 2.1: Token Encryption Service

`apps/server/src/lib/encryption.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return scryptSync(key, 'socialkeys-salt', 32);
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivB64, tagB64, encB64] = ciphertext.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### Step 2.2: Base Platform Adapter Interface

`apps/server/src/adapters/base.adapter.ts`:

```typescript
import type { PlatformType } from '@socialkeys/shared';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface PlatformProfile {
  platformAccountId: string;
  displayName: string;
  profileImageUrl?: string;
  accountType: 'personal' | 'page' | 'business' | 'creator' | 'channel';
  metadata?: Record<string, unknown>;
}

export interface PublishOptions {
  content: string;
  mediaFiles?: MediaFile[];
  scheduledAt?: Date;
  metadata?: Record<string, unknown>;     // platform-specific options
}

export interface MediaFile {
  path: string;
  mimeType: string;
  fileName: string;
  altText?: string;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
}

export interface AnalyticsData {
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  saves?: number;
  videoViews?: number;
  engagementRate?: number;
}

export abstract class BasePlatformAdapter {
  abstract readonly platform: PlatformType;

  // OAuth
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForTokens(code: string): Promise<OAuthTokens>;
  abstract refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  // Profile
  abstract getProfile(accessToken: string): Promise<PlatformProfile>;
  abstract getPages?(accessToken: string): Promise<PlatformProfile[]>;

  // Publishing
  abstract publish(accessToken: string, options: PublishOptions): Promise<PublishResult>;
  abstract deletePost?(accessToken: string, platformPostId: string): Promise<boolean>;

  // Analytics
  abstract getPostAnalytics?(accessToken: string, platformPostId: string): Promise<AnalyticsData>;

  // Validation
  abstract validateContent(content: string, mediaFiles?: MediaFile[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };

  // Token health
  abstract verifyToken(accessToken: string): Promise<boolean>;
}
```

### Step 2.3: Adapter Registry

`apps/server/src/adapters/registry.ts`:

```typescript
import type { PlatformType } from '@socialkeys/shared';
import { BasePlatformAdapter } from './base.adapter';
// Adapters will be registered as they're implemented
const adapters = new Map<PlatformType, BasePlatformAdapter>();

export function registerAdapter(adapter: BasePlatformAdapter): void {
  adapters.set(adapter.platform, adapter);
}

export function getAdapter(platform: PlatformType): BasePlatformAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return adapter;
}

export function getRegisteredPlatforms(): PlatformType[] {
  return Array.from(adapters.keys());
}
```

### Step 2.4: OAuth Routes

`apps/server/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import { getAdapter } from '../adapters/registry';
import { encrypt } from '../lib/encryption';
import { db, accounts } from '@socialkeys/database';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { PlatformType } from '@socialkeys/shared';
import { authMiddleware } from '../middleware/auth.middleware';

export const authRoutes = Router();

// Generate OAuth state token (CSRF protection)
const oauthStates = new Map<string, { userId: string; platform: PlatformType; expiresAt: number }>();

// Step 1: Redirect to platform OAuth page
authRoutes.get('/:platform/connect', authMiddleware, (req, res) => {
  const { platform } = req.params as { platform: PlatformType };
  const adapter = getAdapter(platform);

  const state = randomBytes(32).toString('hex');
  oauthStates.set(state, {
    userId: req.user!.id,
    platform,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min expiry
  });

  // Clean expired states
  for (const [key, val] of oauthStates) {
    if (val.expiresAt < Date.now()) oauthStates.delete(key);
  }

  const authUrl = adapter.getAuthorizationUrl(state);
  res.json({ authUrl });
});

// Step 2: OAuth callback — exchange code for tokens, save account
authRoutes.get('/:platform/callback', async (req, res) => {
  const { platform } = req.params as { platform: PlatformType };
  const { code, state } = req.query as { code: string; state: string };

  const stateData = oauthStates.get(state);
  if (!stateData || stateData.platform !== platform || stateData.expiresAt < Date.now()) {
    return res.redirect(`${process.env.FRONTEND_URL}/accounts?error=invalid_state`);
  }
  oauthStates.delete(state);

  try {
    const adapter = getAdapter(platform);
    const tokens = await adapter.exchangeCodeForTokens(code);
    const profile = await adapter.getProfile(tokens.accessToken);

    // Upsert account (update if same platform + platformAccountId exists)
    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, stateData.userId),
        eq(accounts.platform, platform),
        eq(accounts.platformAccountId, profile.platformAccountId),
      ),
    });

    const accountData = {
      userId: stateData.userId,
      platform,
      platformAccountId: profile.platformAccountId,
      displayName: profile.displayName,
      profileImageUrl: profile.profileImageUrl,
      accountType: profile.accountType,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
      tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
      scopes: tokens.scopes ? JSON.stringify(tokens.scopes) : null,
      metadata: profile.metadata ? JSON.stringify(profile.metadata) : null,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      await db.update(accounts).set(accountData).where(eq(accounts.id, existing.id));
    } else {
      await db.insert(accounts).values(accountData);
    }

    res.redirect(`${process.env.FRONTEND_URL}/accounts?connected=${platform}`);
  } catch (error) {
    console.error(`OAuth callback error for ${platform}:`, error);
    res.redirect(`${process.env.FRONTEND_URL}/accounts?error=oauth_failed&platform=${platform}`);
  }
});

// List connected accounts for current user
authRoutes.get('/accounts', authMiddleware, async (req, res) => {
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, req.user!.id),
    columns: {
      id: true,
      platform: true,
      displayName: true,
      profileImageUrl: true,
      accountType: true,
      tokenExpiresAt: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });
  res.json({ accounts: userAccounts });
});

// Disconnect an account
authRoutes.delete('/accounts/:accountId', authMiddleware, async (req, res) => {
  await db.delete(accounts).where(
    and(eq(accounts.id, req.params.accountId), eq(accounts.userId, req.user!.id)),
  );
  res.json({ success: true });
});
```

### Step 2.5: Auth Middleware (JWT)

`apps/server/src/middleware/auth.middleware.ts`:

```typescript
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, users } from '@socialkeys/database';
import { eq } from 'drizzle-orm';
import { AppError } from './error.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; displayName: string };
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
    || req.cookies?.token;

  if (!token) {
    return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
      columns: { id: true, email: true, displayName: true },
    });

    if (!user) {
      return next(new AppError(401, 'User not found', 'UNAUTHORIZED'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError(401, 'Invalid token', 'INVALID_TOKEN'));
  }
}
```

### Step 2.6: Account Management API Routes

`apps/server/src/routes/accounts.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, accounts } from '@socialkeys/database';
import { eq, and } from 'drizzle-orm';
import { getAdapter } from '../adapters/registry';
import { decrypt, encrypt } from '../lib/encryption';

export const accountRoutes = Router();
accountRoutes.use(authMiddleware);

// Get all accounts for the authenticated user
accountRoutes.get('/', async (req, res) => {
  const userAccounts = await db.query.accounts.findMany({
    where: eq(accounts.userId, req.user!.id),
    columns: {
      id: true,
      platform: true,
      displayName: true,
      profileImageUrl: true,
      accountType: true,
      tokenExpiresAt: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  // Add token health status
  const withStatus = userAccounts.map(acct => ({
    ...acct,
    tokenStatus: !acct.tokenExpiresAt ? 'unknown'
      : new Date(acct.tokenExpiresAt) > new Date() ? 'valid'
      : 'expired',
  }));

  res.json({ accounts: withStatus });
});

// Refresh a specific account's token
accountRoutes.post('/:accountId/refresh', async (req, res) => {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.accountId), eq(accounts.userId, req.user!.id)),
  });

  if (!account || !account.refreshTokenEncrypted) {
    return res.status(400).json({ error: 'Cannot refresh — no refresh token available' });
  }

  const adapter = getAdapter(account.platform as any);
  const refreshToken = decrypt(account.refreshTokenEncrypted);
  const tokens = await adapter.refreshAccessToken(refreshToken);

  await db.update(accounts).set({
    accessTokenEncrypted: encrypt(tokens.accessToken),
    refreshTokenEncrypted: tokens.refreshToken ? encrypt(tokens.refreshToken) : account.refreshTokenEncrypted,
    tokenExpiresAt: tokens.expiresAt?.toISOString() ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(accounts.id, req.params.accountId));

  res.json({ success: true, expiresAt: tokens.expiresAt });
});

// Toggle account active/inactive
accountRoutes.patch('/:accountId/toggle', async (req, res) => {
  const account = await db.query.accounts.findFirst({
    where: and(eq(accounts.id, req.params.accountId), eq(accounts.userId, req.user!.id)),
    columns: { isActive: true },
  });

  if (!account) return res.status(404).json({ error: 'Account not found' });

  await db.update(accounts).set({
    isActive: !account.isActive,
    updatedAt: new Date().toISOString(),
  }).where(eq(accounts.id, req.params.accountId));

  res.json({ success: true, isActive: !account.isActive });
});
```

### Step 2.7: Frontend Account Manager

`apps/web/src/lib/api.ts`:

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

`apps/web/src/hooks/useAccounts.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { PlatformType } from '@socialkeys/shared';

interface Account {
  id: string;
  platform: PlatformType;
  displayName: string;
  profileImageUrl?: string;
  accountType: string;
  tokenExpiresAt?: string;
  isActive: boolean;
  tokenStatus: 'valid' | 'expired' | 'unknown';
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data } = await api.get<{ accounts: Account[] }>('/accounts');
      return data.accounts;
    },
  });
}

export function useConnectAccount() {
  return useMutation({
    mutationFn: async (platform: PlatformType) => {
      const { data } = await api.get<{ authUrl: string }>(`/auth/${platform}/connect`);
      window.location.href = data.authUrl;
    },
  });
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      await api.delete(`/auth/accounts/${accountId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}

export function useRefreshToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: string) => {
      await api.post(`/accounts/${accountId}/refresh`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
  });
}
```

### Phase 2: Testing Strategy

```typescript
// packages/database/tests/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../apps/server/src/lib/encryption';

describe('Token Encryption', () => {
  it('encrypts and decrypts a token correctly', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    const token = 'ya29.very-secret-oauth-token-12345';
    const encrypted = encrypt(token);
    expect(encrypted).not.toBe(token);
    expect(encrypted).toContain(':'); // iv:tag:data format
    expect(decrypt(encrypted)).toBe(token);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    const token = 'same-token';
    expect(encrypt(token)).not.toBe(encrypt(token));
  });

  it('throws on short encryption key', () => {
    process.env.ENCRYPTION_KEY = 'short';
    expect(() => encrypt('test')).toThrow();
  });
});
```

### Phase 2: Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| OAuth state mismatch (CSRF) | Reject and redirect with `?error=invalid_state` |
| OAuth code already used | Platform returns error → show "Connection failed, try again" |
| Token refresh fails (refresh token expired) | Mark account as `expired`, prompt user to reconnect |
| Duplicate account connection | Upsert — update tokens but keep same account record |
| Encryption key rotation | Support old key for decryption, new key for encryption (migration script) |
| Platform API down during OAuth | Catch network errors, show "Platform unavailable, try later" |
| User connects same platform, different account | Allow — multi-account by design |

---

## Phase 3: LinkedIn & Facebook Adapters

**Goal:** Implement full LinkedIn and Facebook posting adapters with real API integration.

**Estimated Time:** 4-5 days

### Step 3.1: LinkedIn Adapter

`apps/server/src/adapters/linkedin.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';
import axios from 'axios';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_REST_API_URL = 'https://api.linkedin.com/rest';

const SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

export class LinkedInAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType = 'linkedin';

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
      state,
      scope: SCOPES.join(' '),
    });
    return `${LINKEDIN_AUTH_URL}?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const { data } = await axios.post(LINKEDIN_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' ') || SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { data } = await axios.post(LINKEDIN_TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(accessToken: string): Promise<PlatformProfile> {
    const { data } = await axios.get(`${LINKEDIN_API_URL}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      platformAccountId: data.sub,
      displayName: data.name,
      profileImageUrl: data.picture,
      accountType: 'personal',
      metadata: { email: data.email },
    };
  }

  async publish(accessToken: string, options: PublishOptions): Promise<PublishResult> {
    try {
      // Get user URN
      const { data: userInfo } = await axios.get(`${LINKEDIN_API_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const authorUrn = `urn:li:person:${userInfo.sub}`;

      // Upload media if present
      let mediaAssets: any[] = [];
      if (options.mediaFiles?.length) {
        for (const file of options.mediaFiles) {
          const asset = await this.uploadMedia(accessToken, authorUrn, file);
          if (asset) mediaAssets.push(asset);
        }
      }

      // Create post via Posts API (REST)
      const postBody: any = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        visibility: 'PUBLIC',
        commentary: options.content,
        distribution: {
          feedDistribution: 'MAIN_FEED',
        },
      };

      // Attach media if uploaded
      if (mediaAssets.length === 1) {
        postBody.content = {
          media: {
            id: mediaAssets[0],
          },
        };
      } else if (mediaAssets.length > 1) {
        postBody.content = {
          multiImage: {
            images: mediaAssets.map(id => ({ id })),
          },
        };
      }

      const { data, headers } = await axios.post(
        `${LINKEDIN_REST_API_URL}/posts`,
        postBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202405',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      const postId = headers['x-restli-id'] || data.id;

      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  private async uploadMedia(accessToken: string, authorUrn: string, file: MediaFile): Promise<string | null> {
    const { readFileSync } = await import('fs');
    const isVideo = file.mimeType.startsWith('video/');

    // Step 1: Register upload
    const initBody = {
      initializeUploadRequest: {
        owner: authorUrn,
      },
    };

    const endpoint = isVideo
      ? `${LINKEDIN_REST_API_URL}/videos?action=initializeUpload`
      : `${LINKEDIN_REST_API_URL}/images?action=initializeUpload`;

    const { data: initData } = await axios.post(endpoint, initBody, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405',
      },
    });

    const uploadUrl = initData.value?.uploadUrl;
    const mediaId = initData.value?.image || initData.value?.video;

    // Step 2: Upload binary
    const fileBuffer = readFileSync(file.path);
    await axios.put(uploadUrl, fileBuffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': file.mimeType,
      },
      maxBodyLength: Infinity,
    });

    return mediaId;
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (content.length > 3000) errors.push('LinkedIn posts cannot exceed 3,000 characters');
    if (content.length === 0 && !mediaFiles?.length) errors.push('Post must have content or media');
    if (mediaFiles && mediaFiles.length > 9) errors.push('LinkedIn supports max 9 images per post');
    if (content.length > 2500) warnings.push('Posts over 2,500 chars may get truncated in feeds');

    return { valid: errors.length === 0, errors, warnings };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get(`${LINKEDIN_API_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Step 3.2: Facebook Adapter

`apps/server/src/adapters/facebook.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';
import axios from 'axios';

const FB_GRAPH_URL = 'https://graph.facebook.com/v21.0';
const FB_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';
const SCOPES = ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list', 'public_profile'];

export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType = 'facebook';

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
      state,
      scope: SCOPES.join(','),
      response_type: 'code',
    });
    return `${FB_AUTH_URL}?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    // Exchange code for short-lived token
    const { data: shortLived } = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
        code,
      },
    });

    // Exchange short-lived for long-lived token (60 days)
    const { data: longLived } = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: shortLived.access_token,
      },
    });

    return {
      accessToken: longLived.access_token,
      expiresAt: new Date(Date.now() + (longLived.expires_in || 5184000) * 1000), // default 60 days
      scopes: SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Facebook long-lived tokens can be refreshed by exchanging again
    return this.exchangeCodeForTokens(refreshToken);
  }

  async getProfile(accessToken: string): Promise<PlatformProfile> {
    const { data } = await axios.get(`${FB_GRAPH_URL}/me`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,picture.type(large)',
      },
    });

    return {
      platformAccountId: data.id,
      displayName: data.name,
      profileImageUrl: data.picture?.data?.url,
      accountType: 'personal',
    };
  }

  // Get managed Pages (Facebook posting is to Pages, not personal profiles)
  async getPages(accessToken: string): Promise<PlatformProfile[]> {
    const { data } = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,picture.type(large),access_token,category',
      },
    });

    return data.data.map((page: any) => ({
      platformAccountId: page.id,
      displayName: page.name,
      profileImageUrl: page.picture?.data?.url,
      accountType: 'page' as const,
      metadata: {
        pageAccessToken: page.access_token,  // Page-specific permanent token
        category: page.category,
      },
    }));
  }

  async publish(accessToken: string, options: PublishOptions): Promise<PublishResult> {
    try {
      // For Facebook, we post to a Page (stored in metadata.pageAccessToken)
      const pageAccessToken = (options.metadata?.pageAccessToken as string) || accessToken;
      const pageId = options.metadata?.pageId as string;

      if (!pageId) {
        return { success: false, error: 'No Page ID specified — Facebook requires Page context' };
      }

      let result: any;

      if (options.mediaFiles?.length && options.mediaFiles[0].mimeType.startsWith('image/')) {
        // Photo post
        const { createReadStream } = await import('fs');
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('source', createReadStream(options.mediaFiles[0].path));
        form.append('message', options.content);
        form.append('access_token', pageAccessToken);

        const { data } = await axios.post(`${FB_GRAPH_URL}/${pageId}/photos`, form, {
          headers: form.getHeaders(),
          maxBodyLength: Infinity,
        });
        result = data;
      } else {
        // Text post
        const { data } = await axios.post(`${FB_GRAPH_URL}/${pageId}/feed`, {
          message: options.content,
          access_token: pageAccessToken,
        });
        result = data;
      }

      return {
        success: true,
        platformPostId: result.id || result.post_id,
        platformPostUrl: `https://www.facebook.com/${result.id || result.post_id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (content.length > 63206) errors.push('Facebook posts cannot exceed 63,206 characters');
    if (content.length === 0 && !mediaFiles?.length) errors.push('Post must have content or media');
    if (mediaFiles && mediaFiles.length > 10) errors.push('Facebook supports max 10 images per post');

    return { valid: errors.length === 0, errors, warnings };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const { data } = await axios.get(`${FB_GRAPH_URL}/me`, {
        params: { access_token: accessToken },
      });
      return !!data.id;
    } catch {
      return false;
    }
  }
}
```

### Step 3.3: Register Adapters at Server Startup

`apps/server/src/adapters/index.ts`:

```typescript
import { registerAdapter } from './registry';
import { LinkedInAdapter } from './linkedin.adapter';
import { FacebookAdapter } from './facebook.adapter';
// Future: import { InstagramAdapter } from './instagram.adapter';
// Future: import { YouTubeAdapter } from './youtube.adapter';
// Future: import { TikTokAdapter } from './tiktok.adapter';

export function initializeAdapters() {
  registerAdapter(new LinkedInAdapter());
  registerAdapter(new FacebookAdapter());
  // Future phases will add more adapters here
  console.log('📡 Platform adapters initialized: linkedin, facebook');
}
```

Update `apps/server/src/index.ts`:

```typescript
import 'dotenv/config';
import { createApp } from './app';
import { initializeAdapters } from './adapters/index';

initializeAdapters();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🔑 SocialKeys.ai server running on http://localhost:${PORT}`);
});
```

### Step 3.4: Mock/Sandbox Mode for Local Development

`apps/server/src/adapters/mock.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';

/**
 * Mock adapter for local development without real API keys.
 * Set MOCK_ADAPTERS=true in .env to use.
 */
export class MockAdapter extends BasePlatformAdapter {
  constructor(public readonly platform: PlatformType) {
    super();
  }

  getAuthorizationUrl(state: string): string {
    return `http://localhost:3001/api/auth/${this.platform}/mock-callback?state=${state}&code=mock-code`;
  }

  async exchangeCodeForTokens(_code: string): Promise<OAuthTokens> {
    return {
      accessToken: `mock-access-token-${this.platform}-${Date.now()}`,
      refreshToken: `mock-refresh-token-${this.platform}`,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      scopes: ['mock-scope'],
    };
  }

  async refreshAccessToken(_refreshToken: string): Promise<OAuthTokens> {
    return this.exchangeCodeForTokens('refresh');
  }

  async getProfile(_accessToken: string): Promise<PlatformProfile> {
    return {
      platformAccountId: `mock-${this.platform}-${Date.now()}`,
      displayName: `Mock ${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)} Account`,
      profileImageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.platform}`,
      accountType: 'personal',
    };
  }

  async publish(_accessToken: string, options: PublishOptions): Promise<PublishResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 90% success rate in mock mode
    if (Math.random() > 0.1) {
      const postId = `mock-post-${Date.now()}`;
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://${this.platform}.com/mock/${postId}`,
      };
    }

    return {
      success: false,
      error: 'Mock: Simulated API failure (10% chance)',
    };
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    return { valid: true, errors: [], warnings: ['Running in mock mode'] };
  }

  async verifyToken(_accessToken: string): Promise<boolean> {
    return true;
  }
}
```

### Phase 3: Testing Strategy

```typescript
// apps/server/tests/adapters/linkedin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInAdapter } from '../../src/adapters/linkedin.adapter';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('LinkedInAdapter', () => {
  const adapter = new LinkedInAdapter();

  it('generates correct authorization URL', () => {
    process.env.LINKEDIN_CLIENT_ID = 'test-client-id';
    process.env.LINKEDIN_REDIRECT_URI = 'http://localhost:3001/api/auth/linkedin/callback';
    const url = adapter.getAuthorizationUrl('test-state');
    expect(url).toContain('www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('state=test-state');
    expect(url).toContain('w_member_social');
  });

  it('validates content length correctly', () => {
    const short = adapter.validateContent('Hello LinkedIn!');
    expect(short.valid).toBe(true);

    const toolong = adapter.validateContent('x'.repeat(3001));
    expect(toolong.valid).toBe(false);
    expect(toolong.errors).toHaveLength(1);
  });

  it('exchanges code for tokens', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expires_in: 5184000,
        scope: 'openid profile',
      },
    });

    const tokens = await adapter.exchangeCodeForTokens('test-code');
    expect(tokens.accessToken).toBe('test-token');
    expect(tokens.refreshToken).toBe('test-refresh');
  });
});
```

### Phase 3: Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| LinkedIn 429 rate limit | Parse `Retry-After` header, queue retry with exponential backoff |
| Facebook Page token expired | Page tokens from long-lived user tokens should not expire; if they do, re-auth |
| LinkedIn org posting without Marketing Partner | Return clear error: "Organization posting requires Marketing Developer Platform access" |
| Facebook Group posting attempt | Return clear error: "Facebook Group posting is no longer supported via API" |
| Media upload timeout | 60s timeout, retry once, then fail with clear message |
| Invalid image format for platform | Validate before upload, return format requirements |
| Network timeout during OAuth callback | Retry the token exchange once; if still failing, redirect with error |

---

## Phase 4: Post Composer & Media Handling

**Goal:** Build the full post composer UI with account selector, media uploads, platform previews, and the backend post CRUD API.

**Estimated Time:** 5-6 days

### Step 4.1: Post CRUD API Routes

`apps/server/src/routes/posts.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, posts, postTargets, media, accounts } from '@socialkeys/database';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getAdapter } from '../adapters/registry';
import { decrypt } from '../lib/encryption';
import { AppError } from '../middleware/error.middleware';

export const postRoutes = Router();
postRoutes.use(authMiddleware);

const createPostSchema = z.object({
  content: z.string().max(65000).default(''),
  targetAccountIds: z.array(z.string().uuid()).min(1, 'Select at least one account'),
  scheduledAt: z.string().datetime().optional(),
  campaignId: z.string().uuid().optional(),
  publishNow: z.boolean().default(false),
});

// Create a new post
postRoutes.post('/', async (req, res, next) => {
  try {
    const body = createPostSchema.parse(req.body);

    // Verify all target accounts belong to the user
    const targetAccounts = await db.query.accounts.findMany({
      where: and(eq(accounts.userId, req.user!.id)),
    });
    const validIds = new Set(targetAccounts.map(a => a.id));
    const invalidIds = body.targetAccountIds.filter(id => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new AppError(400, `Invalid account IDs: ${invalidIds.join(', ')}`, 'INVALID_ACCOUNTS');
    }

    // Validate content against each platform
    for (const accountId of body.targetAccountIds) {
      const account = targetAccounts.find(a => a.id === accountId)!;
      const adapter = getAdapter(account.platform as any);
      const validation = adapter.validateContent(body.content);
      if (!validation.valid) {
        throw new AppError(400, `Validation failed for ${account.platform}: ${validation.errors.join(', ')}`, 'CONTENT_VALIDATION');
      }
    }

    // Determine status
    const status = body.publishNow ? 'publishing' : body.scheduledAt ? 'scheduled' : 'draft';

    // Insert post
    const [post] = await db.insert(posts).values({
      userId: req.user!.id,
      content: body.content,
      status,
      scheduledAt: body.scheduledAt || null,
      campaignId: body.campaignId || null,
    }).returning();

    // Insert post targets
    const targets = body.targetAccountIds.map(accountId => {
      const account = targetAccounts.find(a => a.id === accountId)!;
      return {
        postId: post.id,
        accountId,
        platform: account.platform,
        status: body.publishNow ? 'publishing' as const : 'pending' as const,
      };
    });
    await db.insert(postTargets).values(targets);

    // If publishNow, trigger immediate publishing (async)
    if (body.publishNow) {
      // Fire and forget — the scheduler will handle status updates
      publishPostToTargets(post.id).catch(err =>
        console.error('Publish error:', err)
      );
    }

    res.status(201).json({ post: { ...post, targets } });
  } catch (error) {
    next(error);
  }
});

// List posts for current user
postRoutes.get('/', async (req, res) => {
  const { status, campaignId, limit = '50', offset = '0' } = req.query as Record<string, string>;

  const userPosts = await db.query.posts.findMany({
    where: eq(posts.userId, req.user!.id),
    orderBy: [desc(posts.createdAt)],
    limit: Math.min(parseInt(limit), 100),
    offset: parseInt(offset),
    with: {
      // Drizzle relations would be defined for this
    },
  });

  res.json({ posts: userPosts });
});

// Get single post with targets and media
postRoutes.get('/:postId', async (req, res) => {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, req.params.postId), eq(posts.userId, req.user!.id)),
  });
  if (!post) throw new AppError(404, 'Post not found');

  const targets = await db.query.postTargets.findMany({
    where: eq(postTargets.postId, post.id),
  });
  const postMedia = await db.query.media.findMany({
    where: eq(media.postId, post.id),
  });

  res.json({ post: { ...post, targets, media: postMedia } });
});

// Update draft post
postRoutes.patch('/:postId', async (req, res) => {
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, req.params.postId), eq(posts.userId, req.user!.id)),
  });
  if (!post) throw new AppError(404, 'Post not found');
  if (post.status !== 'draft') throw new AppError(400, 'Can only edit draft posts');

  await db.update(posts).set({
    content: req.body.content ?? post.content,
    scheduledAt: req.body.scheduledAt ?? post.scheduledAt,
    campaignId: req.body.campaignId ?? post.campaignId,
    updatedAt: new Date().toISOString(),
  }).where(eq(posts.id, post.id));

  res.json({ success: true });
});

// Delete a post
postRoutes.delete('/:postId', async (req, res) => {
  await db.delete(posts).where(
    and(eq(posts.id, req.params.postId), eq(posts.userId, req.user!.id)),
  );
  res.json({ success: true });
});

// Internal: publish to all targets
async function publishPostToTargets(postId: string) {
  const targets = await db.query.postTargets.findMany({
    where: and(eq(postTargets.postId, postId), eq(postTargets.status, 'publishing')),
  });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });
  if (!post) return;

  const results = await Promise.allSettled(
    targets.map(async (target) => {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, target.accountId),
      });
      if (!account) throw new Error(`Account ${target.accountId} not found`);

      const adapter = getAdapter(account.platform as any);
      const accessToken = decrypt(account.accessTokenEncrypted);
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};

      const result = await adapter.publish(accessToken, {
        content: post.content,
        metadata: {
          ...metadata,
          pageId: metadata.pageId,
          pageAccessToken: metadata.pageAccessToken,
        },
      });

      // Update target status
      await db.update(postTargets).set({
        status: result.success ? 'published' : 'failed',
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
        publishedAt: result.success ? new Date().toISOString() : null,
        errorMessage: result.error,
      }).where(eq(postTargets.id, target.id));

      return result;
    }),
  );

  // Update overall post status
  const allPublished = results.every(r => r.status === 'fulfilled' && (r.value as any).success);
  const anyPublished = results.some(r => r.status === 'fulfilled' && (r.value as any).success);

  await db.update(posts).set({
    status: allPublished ? 'published' : anyPublished ? 'partial' : 'failed',
    updatedAt: new Date().toISOString(),
  }).where(eq(posts.id, postId));
}
```

### Step 4.2: Media Upload API

`apps/server/src/routes/media.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { db, media } from '@socialkeys/database';
import { AppError } from '../middleware/error.middleware';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads';
const MAX_FILE_SIZE = (Number(process.env.MAX_FILE_SIZE_MB) || 100) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowedImages = (process.env.ALLOWED_IMAGE_TYPES || '').split(',');
    const allowedVideos = (process.env.ALLOWED_VIDEO_TYPES || '').split(',');
    const allowed = [...allowedImages, ...allowedVideos];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `File type ${file.mimetype} is not supported`) as any);
    }
  },
});

export const mediaRoutes = Router();
mediaRoutes.use(authMiddleware);

// Upload media files for a post
mediaRoutes.post('/:postId/media', upload.array('files', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files?.length) throw new AppError(400, 'No files uploaded');

  const mediaRecords = files.map((file, index) => ({
    postId: req.params.postId,
    type: file.mimetype.startsWith('video/') ? 'video' as const
      : file.mimetype === 'image/gif' ? 'gif' as const
      : 'image' as const,
    fileName: file.originalname,
    filePath: file.path,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    sortOrder: index,
  }));

  await db.insert(media).values(mediaRecords);

  res.status(201).json({
    media: mediaRecords.map(m => ({
      ...m,
      url: `/uploads/${path.basename(m.filePath)}`,
    })),
  });
});
```

### Step 4.3: Frontend Post Composer Component

`apps/web/src/components/composer/AccountSelector.tsx`:

```tsx
import { useAccounts } from '../../hooks/useAccounts';
import { PLATFORM_CONFIGS, type PlatformType } from '@socialkeys/shared';
import { clsx } from 'clsx';

interface AccountSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AccountSelector({ selectedIds, onChange }: AccountSelectorProps) {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No accounts connected yet.</p>
        <a href="/accounts" className="text-blue-600 hover:underline mt-2 inline-block">
          Connect your first account →
        </a>
      </div>
    );
  }

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(x => x !== id)
        : [...selectedIds, id],
    );
  };

  // Group by platform
  const grouped = accounts.reduce((acc, account) => {
    (acc[account.platform] ??= []).push(account);
    return acc;
  }, {} as Record<string, typeof accounts>);

  return (
    <div className="space-y-1">
      {Object.entries(grouped).map(([platform, platformAccounts]) => {
        const config = PLATFORM_CONFIGS[platform as PlatformType];
        return platformAccounts.map(account => (
          <label
            key={account.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              selectedIds.includes(account.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
              !account.isActive && 'opacity-50 cursor-not-allowed',
            )}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(account.id)}
              onChange={() => toggle(account.id)}
              disabled={!account.isActive}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xl">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{account.displayName}</p>
              <p className="text-xs text-gray-500">{config.displayName} · {account.accountType}</p>
            </div>
            {account.tokenStatus === 'expired' && (
              <span className="text-xs text-red-500 font-medium">Token Expired</span>
            )}
          </label>
        ));
      })}
    </div>
  );
}
```

`apps/web/src/components/composer/ContentEditor.tsx`:

```tsx
import { useRef, useCallback } from 'react';
import { PLATFORM_CONFIGS, type PlatformType } from '@socialkeys/shared';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  selectedPlatforms: PlatformType[];
}

export function ContentEditor({ content, onChange, selectedPlatforms }: ContentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.max(el.scrollHeight, 150)}px`;
    }
  }, []);

  // Get the most restrictive character limit among selected platforms
  const charLimits = selectedPlatforms.map(p => ({
    platform: p,
    limit: PLATFORM_CONFIGS[p].maxTextLength,
  }));
  const mostRestrictive = charLimits.sort((a, b) => a.limit - b.limit)[0];

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize();
        }}
        placeholder="What would you like to share?"
        className="w-full min-h-[150px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white text-base"
        aria-label="Post content"
      />

      {/* Character counters per platform */}
      <div className="flex flex-wrap gap-3 text-xs">
        {charLimits.map(({ platform, limit }) => {
          const pct = content.length / limit;
          const color = pct < 0.8 ? 'text-gray-400' : pct < 1 ? 'text-yellow-500' : 'text-red-500';
          return (
            <span key={platform} className={color}>
              {PLATFORM_CONFIGS[platform].icon} {content.length.toLocaleString()}/{limit.toLocaleString()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

`apps/web/src/components/composer/PlatformPreview.tsx`:

```tsx
import { useState } from 'react';
import { PLATFORM_CONFIGS, type PlatformType } from '@socialkeys/shared';
import { clsx } from 'clsx';

interface PlatformPreviewProps {
  content: string;
  platforms: PlatformType[];
  mediaUrls: string[];
  accountName: string;
}

export function PlatformPreview({ content, platforms, mediaUrls, accountName }: PlatformPreviewProps) {
  const [activeTab, setActiveTab] = useState<PlatformType>(platforms[0]);

  if (!platforms.length) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {platforms.map(platform => (
          <button
            key={platform}
            onClick={() => setActiveTab(platform)}
            className={clsx(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors',
              activeTab === platform
                ? 'bg-white dark:bg-gray-800 border-b-2'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
            )}
            style={activeTab === platform ? { borderBottomColor: PLATFORM_CONFIGS[platform].color } : {}}
          >
            {PLATFORM_CONFIGS[platform].icon} {PLATFORM_CONFIGS[platform].displayName}
          </button>
        ))}
      </div>

      {/* Preview content */}
      <div className="p-4">
        <div className="max-w-sm mx-auto">
          {/* Platform-specific preview rendering */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full" />
            <div>
              <p className="text-sm font-semibold">{accountName}</p>
              <p className="text-xs text-gray-500">Just now · 🌐</p>
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            {content || <span className="text-gray-400 italic">Your post preview will appear here...</span>}
          </p>
          {mediaUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
              {mediaUrls.slice(0, 4).map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 4.4: Media Upload Component with Drag & Drop

`apps/web/src/components/composer/MediaUpload.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image, Film } from 'lucide-react';
import { api } from '../../lib/api';

interface MediaUploadProps {
  postId?: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'gif';
  size: number;
  uploading?: boolean;
}

export function MediaUpload({ postId, files, onChange, maxFiles = 10 }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create preview placeholders
    const previews: UploadedFile[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : file.type === 'image/gif' ? 'gif' : 'image',
      size: file.size,
      uploading: true,
    }));
    onChange([...files, ...previews]);

    // Upload to server if postId exists
    if (postId) {
      setUploading(true);
      const formData = new FormData();
      acceptedFiles.forEach(file => formData.append('files', file));

      try {
        const { data } = await api.post(`/posts/${postId}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Replace preview placeholders with server-side data
        onChange([
          ...files,
          ...data.media.map((m: any) => ({ ...m, uploading: false })),
        ]);
      } catch (error) {
        console.error('Upload failed:', error);
        onChange(files); // revert
      } finally {
        setUploading(false);
      }
    }
  }, [files, onChange, postId, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: maxFiles - files.length,
    disabled: uploading,
  });

  const removeFile = (id: string) => {
    onChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map(file => (
            <div key={file.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
              {file.type === 'video' ? (
                <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                  <Film className="w-8 h-8 text-gray-400" />
                </div>
              ) : (
                <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
              )}
              {file.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <button
                onClick={() => removeFile(file.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {isDragActive ? 'Drop files here...' : 'Drag & drop media files, or click to browse'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG, GIF, WebP, MP4, MOV · Max {maxFiles} files
          </p>
        </div>
      )}
    </div>
  );
}
```

### Phase 4: UI/UX Considerations

- **Autosave drafts:** Save to localStorage every 5 seconds while composing; persist to server on explicit save
- **Platform-specific content warnings:** Real-time validation as user types (character limits, media constraints)
- **Keyboard shortcuts:** Ctrl+Enter to post, Ctrl+S to save draft, Ctrl+Shift+A to open AI panel
- **Accessibility:** All interactive elements have aria-labels, focus rings visible, screen reader announcements for upload status
- **Responsive layout:** Single column on mobile, side-by-side composer + preview on desktop (lg+)
- **Loading states:** Skeleton screens for account list, spinner on media upload, progress bar for multi-platform posting
- **Error states:** Per-platform error badges on post targets, inline retry buttons
- **Empty states:** Friendly illustrations (or emoji-based) with CTAs when no accounts connected or no posts created

### Phase 4: Testing Strategy

| Test Type | What to Test |
|-----------|-------------|
| Unit | `createPostSchema` Zod validation (valid/invalid inputs) |
| Unit | Content validation per platform adapter |
| Unit | Media file type filtering |
| Integration | POST `/api/posts` creates post + targets in DB |
| Integration | File upload stores file and creates media record |
| Component | AccountSelector renders accounts, toggles selection |
| Component | ContentEditor shows character counts per platform |
| Component | MediaUpload handles drag-and-drop, shows previews |
| E2E | Full flow: select accounts → write content → upload image → post |

---

## Phase 5: Scheduling Engine

**Goal:** Build a reliable scheduling system with cron-based polling, job queue, retry logic, and timezone handling.

**Estimated Time:** 3-4 days

### Step 5.1: Database — Scheduled Jobs Table

Add to `packages/database/src/schema/scheduler.ts`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const scheduledJobs = sqliteTable('scheduled_jobs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text('post_id').notNull(),
  targetId: text('target_id').notNull(),
  scheduledAt: text('scheduled_at').notNull(),    // ISO 8601 UTC
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
  }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastAttemptAt: text('last_attempt_at'),
  nextRetryAt: text('next_retry_at'),
  errorLog: text('error_log'),                     // JSON array of error messages
  lockedBy: text('locked_by'),                     // instance ID for concurrency
  lockedAt: text('locked_at'),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
```

### Step 5.2: Scheduler Service

`apps/server/src/scheduler/scheduler.service.ts`:

```typescript
import { db, scheduledJobs, posts, postTargets, accounts } from '@socialkeys/database';
import { eq, and, lte, isNull, or } from 'drizzle-orm';
import { getAdapter } from '../adapters/registry';
import { decrypt } from '../lib/encryption';
import { randomUUID } from 'crypto';

const INSTANCE_ID = randomUUID();
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — stale lock threshold

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private running = false;

  start(pollIntervalMs: number = 30000) {
    if (this.intervalId) return;
    console.log(`⏰ Scheduler started (polling every ${pollIntervalMs / 1000}s)`);

    // Run immediately, then on interval
    this.poll();
    this.intervalId = setInterval(() => this.poll(), pollIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏰ Scheduler stopped');
    }
  }

  private async poll() {
    if (this.running) return; // prevent overlapping polls
    this.running = true;

    try {
      const now = new Date().toISOString();

      // Find jobs that are due and not locked (or lock is stale)
      const dueJobs = await db.select().from(scheduledJobs).where(
        and(
          eq(scheduledJobs.status, 'pending'),
          lte(scheduledJobs.scheduledAt, now),
          or(
            isNull(scheduledJobs.lockedBy),
            lte(scheduledJobs.lockedAt, new Date(Date.now() - LOCK_TIMEOUT_MS).toISOString()),
          ),
        ),
      ).limit(10); // Process 10 jobs per tick

      for (const job of dueJobs) {
        await this.processJob(job);
      }

      // Also check for retry-eligible failed jobs
      const retryJobs = await db.select().from(scheduledJobs).where(
        and(
          eq(scheduledJobs.status, 'failed'),
          lte(scheduledJobs.nextRetryAt!, now),
        ),
      ).limit(5);

      for (const job of retryJobs) {
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Scheduler poll error:', error);
    } finally {
      this.running = false;
    }
  }

  private async processJob(job: typeof scheduledJobs.$inferSelect) {
    // Lock the job
    await db.update(scheduledJobs).set({
      lockedBy: INSTANCE_ID,
      lockedAt: new Date().toISOString(),
      status: 'processing',
      attempts: job.attempts + 1,
      lastAttemptAt: new Date().toISOString(),
    }).where(eq(scheduledJobs.id, job.id));

    try {
      // Get the post target and account
      const target = await db.query.postTargets.findFirst({
        where: eq(postTargets.id, job.targetId),
      });
      if (!target) throw new Error('Post target not found');

      const post = await db.query.posts.findFirst({
        where: eq(posts.id, job.postId),
      });
      if (!post) throw new Error('Post not found');

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, target.accountId),
      });
      if (!account) throw new Error('Account not found');

      // Publish
      const adapter = getAdapter(account.platform as any);
      const accessToken = decrypt(account.accessTokenEncrypted);
      const metadata = account.metadata ? JSON.parse(account.metadata) : {};

      const result = await adapter.publish(accessToken, {
        content: post.content,
        metadata,
      });

      if (result.success) {
        // Mark job as completed
        await db.update(scheduledJobs).set({
          status: 'completed',
          completedAt: new Date().toISOString(),
          lockedBy: null,
          lockedAt: null,
        }).where(eq(scheduledJobs.id, job.id));

        // Update post target
        await db.update(postTargets).set({
          status: 'published',
          platformPostId: result.platformPostId,
          platformPostUrl: result.platformPostUrl,
          publishedAt: new Date().toISOString(),
        }).where(eq(postTargets.id, job.targetId));

        console.log(`✅ Published ${job.postId} to ${account.platform}`);
      } else {
        throw new Error(result.error || 'Unknown publishing error');
      }
    } catch (error: any) {
      const errorLog = job.errorLog ? JSON.parse(job.errorLog) : [];
      errorLog.push({ attempt: job.attempts + 1, error: error.message, at: new Date().toISOString() });

      const isFinalAttempt = job.attempts + 1 >= job.maxAttempts;

      // Exponential backoff: 1min, 4min, 16min
      const retryDelayMs = Math.pow(4, job.attempts) * 60000;
      const nextRetryAt = isFinalAttempt ? null : new Date(Date.now() + retryDelayMs).toISOString();

      await db.update(scheduledJobs).set({
        status: isFinalAttempt ? 'failed' : 'pending',
        errorLog: JSON.stringify(errorLog),
        nextRetryAt,
        lockedBy: null,
        lockedAt: null,
      }).where(eq(scheduledJobs.id, job.id));

      // Update post target on final failure
      if (isFinalAttempt) {
        await db.update(postTargets).set({
          status: 'failed',
          errorMessage: error.message,
          retryCount: job.attempts + 1,
        }).where(eq(postTargets.id, job.targetId));
      }

      console.error(`❌ Job ${job.id} failed (attempt ${job.attempts + 1}/${job.maxAttempts}): ${error.message}`);
    }
  }
}
```

### Step 5.3: Create Scheduled Jobs on Post Creation

When a post is created with `scheduledAt`, create a scheduled job per target:

```typescript
// In posts.routes.ts — after inserting post targets
if (body.scheduledAt) {
  const jobValues = targets.map(target => ({
    postId: post.id,
    targetId: target.id, // from the insert result
    scheduledAt: body.scheduledAt!,
  }));
  await db.insert(scheduledJobs).values(jobValues);
}
```

### Step 5.4: Start Scheduler in Server

Update `apps/server/src/index.ts`:

```typescript
import { SchedulerService } from './scheduler/scheduler.service';

// ... after app.listen
if (process.env.SCHEDULER_ENABLED !== 'false') {
  const scheduler = new SchedulerService();
  scheduler.start(Number(process.env.SCHEDULER_POLL_INTERVAL_MS) || 30000);

  // Graceful shutdown
  process.on('SIGTERM', () => scheduler.stop());
  process.on('SIGINT', () => scheduler.stop());
}
```

### Step 5.5: Frontend Scheduling UI

Key components needed:
- `DateTimePicker` — date and time selection with timezone dropdown
- `ScheduleDisplay` — shows upcoming scheduled posts sorted by time
- Calendar view — weekly/monthly grid showing scheduled posts

**Timezone handling:**
```typescript
// Always store in UTC in the database
// Display in user's local timezone or selected timezone
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

// User selects a local date/time → convert to UTC for storage
const utcDate = zonedTimeToUtc(localDate, userTimezone);

// Display scheduled time in user's timezone
const displayTime = formatInTimeZone(utcDate, userTimezone, 'PPpp');
```

### Phase 5: Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Server crash mid-publish | Stale lock detection (5min timeout), job retried on next poll |
| Duplicate publish (lock race) | Check `platformPostId` before publishing; if already set, skip |
| Token expired at publish time | Attempt token refresh first; if refresh fails, fail job with "Re-authenticate required" |
| Scheduled time in the past | Publish immediately (don't reject — allow backdated scheduling) |
| Timezone DST transitions | Always store/compare UTC; convert to local only for display |
| All retries exhausted | Mark as `failed`, notify user (future: email/push notification) |
| User cancels scheduled post | Set job status to `cancelled`, update post status |
| Database locked during concurrent writes | SQLite WAL mode handles this; retry on SQLITE_BUSY |

---

## Phase 6: Instagram, YouTube Shorts, TikTok Adapters

**Goal:** Implement adapters for Instagram (via Meta Graph API), YouTube Shorts (via YouTube Data API v3), and TikTok (via Content Posting API).

**Estimated Time:** 5-7 days

### Step 6.1: Instagram Adapter

`apps/server/src/adapters/instagram.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';
import axios from 'axios';

const FB_GRAPH_URL = 'https://graph.facebook.com/v21.0';
const FB_AUTH_URL = 'https://www.facebook.com/v21.0/dialog/oauth';
const SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'];

export class InstagramAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType = 'instagram';

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID!,       // Same Meta app
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
      state,
      scope: SCOPES.join(','),
      response_type: 'code',
    });
    return `${FB_AUTH_URL}?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    // Same as Facebook — Instagram uses Meta Graph API
    const { data: shortLived } = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
        code,
      },
    });

    // Long-lived token
    const { data: longLived } = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: shortLived.access_token,
      },
    });

    return {
      accessToken: longLived.access_token,
      expiresAt: new Date(Date.now() + (longLived.expires_in || 5184000) * 1000),
      scopes: SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Long-lived tokens can be refreshed before expiry
    const { data } = await axios.get(`${FB_GRAPH_URL}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        fb_exchange_token: refreshToken,
      },
    });
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
    };
  }

  async getProfile(accessToken: string): Promise<PlatformProfile> {
    // Get Pages linked to Instagram Business accounts
    const { data: pages } = await axios.get(`${FB_GRAPH_URL}/me/accounts`, {
      params: { access_token: accessToken, fields: 'id,name,instagram_business_account' },
    });

    const igPages = pages.data.filter((p: any) => p.instagram_business_account);
    if (igPages.length === 0) {
      throw new Error('No Instagram Business accounts found. Please link an Instagram Business account to a Facebook Page.');
    }

    const igAccountId = igPages[0].instagram_business_account.id;
    const { data: igProfile } = await axios.get(`${FB_GRAPH_URL}/${igAccountId}`, {
      params: { access_token: accessToken, fields: 'id,username,profile_picture_url,name' },
    });

    return {
      platformAccountId: igProfile.id,
      displayName: igProfile.username || igProfile.name,
      profileImageUrl: igProfile.profile_picture_url,
      accountType: 'business',
      metadata: {
        igAccountId: igProfile.id,
        facebookPageId: igPages[0].id,
      },
    };
  }

  /**
   * Instagram Content Publishing is a two-step process:
   * 1. Create a media container
   * 2. Publish the container
   */
  async publish(accessToken: string, options: PublishOptions): Promise<PublishResult> {
    try {
      const igAccountId = options.metadata?.igAccountId as string;
      if (!igAccountId) {
        return { success: false, error: 'Instagram account ID not found in metadata' };
      }

      let containerId: string;

      if (options.mediaFiles?.length) {
        const file = options.mediaFiles[0];
        const isVideo = file.mimeType.startsWith('video/');

        if (isVideo) {
          // Video container (Reels)
          const { data } = await axios.post(`${FB_GRAPH_URL}/${igAccountId}/media`, {
            video_url: options.metadata?.videoUrl,    // Must be publicly accessible URL
            caption: options.content,
            media_type: 'REELS',
            access_token: accessToken,
          });
          containerId = data.id;

          // Wait for video processing (poll status)
          await this.waitForMediaReady(accessToken, containerId);
        } else {
          // Image container
          const { data } = await axios.post(`${FB_GRAPH_URL}/${igAccountId}/media`, {
            image_url: options.metadata?.imageUrl,    // Must be publicly accessible URL
            caption: options.content,
            access_token: accessToken,
          });
          containerId = data.id;
        }
      } else {
        return { success: false, error: 'Instagram requires at least one image or video' };
      }

      // Step 2: Publish the container
      const { data: publishResult } = await axios.post(`${FB_GRAPH_URL}/${igAccountId}/media_publish`, {
        creation_id: containerId,
        access_token: accessToken,
      });

      return {
        success: true,
        platformPostId: publishResult.id,
        platformPostUrl: `https://www.instagram.com/p/${publishResult.id}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  private async waitForMediaReady(accessToken: string, containerId: string, maxWaitMs = 60000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const { data } = await axios.get(`${FB_GRAPH_URL}/${containerId}`, {
        params: { access_token: accessToken, fields: 'status_code' },
      });
      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') throw new Error('Instagram media processing failed');
      await new Promise(r => setTimeout(r, 3000)); // Poll every 3s
    }
    throw new Error('Instagram media processing timed out');
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mediaFiles?.length) errors.push('Instagram requires at least one image or video');
    if (content.length > 2200) errors.push('Instagram captions cannot exceed 2,200 characters');
    if (mediaFiles && mediaFiles.length > 10) errors.push('Instagram carousel supports max 10 items');

    // Instagram only supports JPEG for images via API
    if (mediaFiles) {
      const invalidImages = mediaFiles.filter(f =>
        f.mimeType.startsWith('image/') && f.mimeType !== 'image/jpeg'
      );
      if (invalidImages.length > 0) {
        warnings.push('Instagram API only supports JPEG images — other formats may fail');
      }
    }

    // Hashtag encoding warning
    if (content.includes('#')) {
      warnings.push('Hashtags should be URL-encoded (%23) in API calls — handled automatically');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      const { data } = await axios.get(`${FB_GRAPH_URL}/me`, {
        params: { access_token: accessToken },
      });
      return !!data.id;
    } catch {
      return false;
    }
  }
}
```

### Step 6.2: YouTube Shorts Adapter

`apps/server/src/adapters/youtube.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';
import axios from 'axios';
import { createReadStream, statSync } from 'fs';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YT_API_URL = 'https://www.googleapis.com/youtube/v3';
const YT_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos';
const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export class YouTubeAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType = 'youtube';

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',       // Gets refresh token
      prompt: 'consent',            // Force consent to always get refresh token
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const { data } = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scopes: data.scope?.split(' '),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { data } = await axios.post(GOOGLE_TOKEN_URL, {
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });

    return {
      accessToken: data.access_token,
      refreshToken,     // Google doesn't return a new refresh token
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(accessToken: string): Promise<PlatformProfile> {
    const { data } = await axios.get(`${YT_API_URL}/channels`, {
      params: {
        part: 'snippet,statistics',
        mine: true,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const channel = data.items[0];
    return {
      platformAccountId: channel.id,
      displayName: channel.snippet.title,
      profileImageUrl: channel.snippet.thumbnails?.default?.url,
      accountType: 'channel',
      metadata: {
        channelId: channel.id,
        subscriberCount: channel.statistics.subscriberCount,
      },
    };
  }

  async publish(accessToken: string, options: PublishOptions): Promise<PublishResult> {
    try {
      if (!options.mediaFiles?.length || !options.mediaFiles[0].mimeType.startsWith('video/')) {
        return { success: false, error: 'YouTube requires a video file' };
      }

      const videoFile = options.mediaFiles[0];
      const fileSize = statSync(videoFile.path).size;

      // YouTube resumable upload
      // Step 1: Initialize upload
      const { headers: initHeaders } = await axios.post(
        `${YT_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
        {
          snippet: {
            title: options.content.substring(0, 100) || 'Untitled Short',
            description: options.content,
            tags: (options.metadata?.tags as string[]) || [],
            categoryId: '22', // People & Blogs
          },
          status: {
            privacyStatus: (options.metadata?.privacy as string) || 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': videoFile.mimeType,
            'X-Upload-Content-Length': fileSize.toString(),
          },
        },
      );

      const uploadUrl = initHeaders.location;

      // Step 2: Upload the video binary
      const videoStream = createReadStream(videoFile.path);
      const { data: uploadResult } = await axios.put(uploadUrl, videoStream, {
        headers: {
          'Content-Type': videoFile.mimeType,
          'Content-Length': fileSize.toString(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      return {
        success: true,
        platformPostId: uploadResult.id,
        platformPostUrl: `https://youtube.com/shorts/${uploadResult.id}`,
      };
    } catch (error: any) {
      const ytError = error.response?.data?.error;
      return {
        success: false,
        error: ytError?.message || error.message,
        rateLimitRemaining: ytError?.code === 403 ? 0 : undefined,
      };
    }
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mediaFiles?.length) errors.push('YouTube requires a video file');
    if (mediaFiles) {
      const video = mediaFiles[0];
      if (!video.mimeType.startsWith('video/')) errors.push('YouTube only accepts video files');
      if (video.durationSeconds && video.durationSeconds > 60) {
        warnings.push('Videos over 60 seconds will not be classified as Shorts');
      }
    }
    if (content.length > 5000) errors.push('YouTube description cannot exceed 5,000 characters');

    return { valid: errors.length === 0, errors, warnings };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get(`${YT_API_URL}/channels`, {
        params: { part: 'id', mine: true },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

> **YouTube Quota Note:** Default quota = 10,000 units/day. Each upload costs 1,600 units = max ~6 uploads/day. Display remaining quota to users. Apply for quota increase via https://support.google.com/youtube/contact/yt_api_form

### Step 6.3: TikTok Adapter

`apps/server/src/adapters/tiktok.adapter.ts`:

```typescript
import { BasePlatformAdapter, type OAuthTokens, type PlatformProfile, type PublishOptions, type PublishResult, type MediaFile } from './base.adapter';
import type { PlatformType } from '@socialkeys/shared';
import axios from 'axios';
import { createReadStream, statSync } from 'fs';

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';
const SCOPES = ['user.info.basic', 'video.publish', 'video.upload', 'video.list'];

export class TikTokAdapter extends BasePlatformAdapter {
  readonly platform: PlatformType = 'tiktok';

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
      response_type: 'code',
      scope: SCOPES.join(','),
      state,
    });
    return `${TIKTOK_AUTH_URL}/?${params}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const { data } = await axios.post(TIKTOK_TOKEN_URL, {
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),  // 24 hours
      scopes: data.scope?.split(',') || SCOPES,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { data } = await axios.post(TIKTOK_TOKEN_URL, {
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProfile(accessToken: string): Promise<PlatformProfile> {
    const { data } = await axios.get(`${TIKTOK_API_URL}/user/info/`, {
      params: { fields: 'open_id,display_name,avatar_url' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = data.data.user;
    return {
      platformAccountId: user.open_id,
      displayName: user.display_name,
      profileImageUrl: user.avatar_url,
      accountType: 'creator',
    };
  }

  async publish(accessToken: string, options: PublishOptions): Promise<PublishResult> {
    try {
      if (!options.mediaFiles?.length || !options.mediaFiles[0].mimeType.startsWith('video/')) {
        return { success: false, error: 'TikTok requires a video file' };
      }

      const videoFile = options.mediaFiles[0];
      const fileSize = statSync(videoFile.path).size;

      // Step 1: Initialize upload
      const { data: initData } = await axios.post(
        `${TIKTOK_API_URL}/post/publish/video/init/`,
        {
          post_info: {
            title: options.content.substring(0, 2200),
            privacy_level: 'SELF_ONLY',   // Start as private (TikTok requires audit for public)
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: fileSize,
            chunk_size: fileSize,         // Single chunk for files < 64MB
            total_chunk_count: 1,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const uploadUrl = initData.data.upload_url;
      const publishId = initData.data.publish_id;

      // Step 2: Upload the video
      const videoBuffer = createReadStream(videoFile.path);
      await axios.put(uploadUrl, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
          'Content-Length': fileSize.toString(),
        },
        maxBodyLength: Infinity,
      });

      // Step 3: Check publish status (TikTok processes asynchronously)
      // Poll for status
      let publishStatus = 'PROCESSING';
      const startTime = Date.now();
      while (publishStatus === 'PROCESSING' && Date.now() - startTime < 120000) {
        await new Promise(r => setTimeout(r, 5000));
        const { data: statusData } = await axios.post(
          `${TIKTOK_API_URL}/post/publish/status/fetch/`,
          { publish_id: publishId },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        publishStatus = statusData.data.status;
      }

      if (publishStatus === 'PUBLISH_COMPLETE') {
        return {
          success: true,
          platformPostId: publishId,
          platformPostUrl: `https://www.tiktok.com/@user/video/${publishId}`,
        };
      }

      return {
        success: false,
        error: `TikTok publish status: ${publishStatus}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  validateContent(content: string, mediaFiles?: MediaFile[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mediaFiles?.length) errors.push('TikTok requires a video file');
    if (mediaFiles) {
      const video = mediaFiles[0];
      if (!video.mimeType.startsWith('video/')) errors.push('TikTok only accepts video files');
      if (video.durationSeconds && video.durationSeconds > 180) {
        errors.push('TikTok videos cannot exceed 3 minutes');
      }
    }
    if (content.length > 2200) errors.push('TikTok descriptions cannot exceed 2,200 characters');

    warnings.push('TikTok videos may be initially set to private until app audit is approved');

    return { valid: errors.length === 0, errors, warnings };
  }

  async verifyToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get(`${TIKTOK_API_URL}/user/info/`, {
        params: { fields: 'open_id' },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Step 6.4: Register All Adapters

Update `apps/server/src/adapters/index.ts`:

```typescript
import { registerAdapter } from './registry';
import { LinkedInAdapter } from './linkedin.adapter';
import { FacebookAdapter } from './facebook.adapter';
import { InstagramAdapter } from './instagram.adapter';
import { YouTubeAdapter } from './youtube.adapter';
import { TikTokAdapter } from './tiktok.adapter';
import { MockAdapter } from './mock.adapter';

export function initializeAdapters() {
  if (process.env.MOCK_ADAPTERS === 'true') {
    console.log('🎭 Running with MOCK adapters (no real API calls)');
    ['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'].forEach(p =>
      registerAdapter(new MockAdapter(p as any))
    );
    return;
  }

  registerAdapter(new LinkedInAdapter());
  registerAdapter(new FacebookAdapter());
  registerAdapter(new InstagramAdapter());
  registerAdapter(new YouTubeAdapter());
  registerAdapter(new TikTokAdapter());
  console.log('📡 All platform adapters initialized');
}
```

### Phase 6: Special Considerations

| Platform | Key Gotcha |
|----------|-----------|
| Instagram | Images must be publicly accessible URLs (not local files) — need a file hosting solution or use signed URLs |
| Instagram | Two-step publish: create container → publish container. Video containers require polling for processing status |
| Instagram | Max 25 API-published posts per account per 24 hours |
| YouTube | Default quota = 10,000 units/day. Upload = 1,600 units. Max ~6 uploads/day per project |
| YouTube | Shorts = normal upload with vertical aspect ratio + ≤ 60 seconds duration. No special API endpoint |
| YouTube | OAuth consent screen must be verified for production (2-4 week process) |
| TikTok | Videos initially private until app audit passes. Display clear warning to users |
| TikTok | Access token expires in 24 hours — refresh proactively before publishing |
| TikTok | Content Posting API requires app review — 1-3 week approval process |
| All | Rate limits differ significantly between platforms — implement per-platform rate limit tracking |

### Phase 6: Testing Strategy

```typescript
// Test each adapter with mocked HTTP responses
describe('InstagramAdapter', () => {
  it('generates auth URL with correct scopes', () => { /* ... */ });
  it('handles two-step publish flow', async () => { /* ... */ });
  it('waits for video processing', async () => { /* ... */ });
  it('validates content: requires media', () => {
    const result = adapter.validateContent('text only');
    expect(result.valid).toBe(false);
  });
});

describe('YouTubeAdapter', () => {
  it('uses resumable upload protocol', async () => { /* ... */ });
  it('validates video-only requirement', () => { /* ... */ });
  it('warns about duration > 60s for Shorts', () => { /* ... */ });
});

describe('TikTokAdapter', () => {
  it('polls for publish completion', async () => { /* ... */ });
  it('handles 24hr token expiry', async () => { /* ... */ });
});
```

---

## Phase 7: AI Text Content (Copilot SDK)

**Goal:** Integrate GitHub Copilot SDK with Claude Opus 4.6 for AI-powered post content generation.

**Estimated Time:** 3-4 days

### Step 7.1: Install Copilot SDK

```bash
npm install @github/copilot-sdk -w apps/server
```

### Step 7.2: AI Service

`apps/server/src/ai/copilot.service.ts`:

```typescript
import { CopilotClient } from '@github/copilot-sdk';

let client: CopilotClient | null = null;

function getClient(): CopilotClient {
  if (!client) {
    client = new CopilotClient();
  }
  return client;
}

export interface GenerateTextOptions {
  prompt: string;
  platform: string;
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational';
  length?: 'short' | 'medium' | 'long';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  language?: string;
  context?: string;         // Brand voice, campaign context, etc.
}

export interface GenerateTextResult {
  content: string;
  hashtags: string[];
  suggestions: string[];     // Alternative phrasings
}

export async function generatePostContent(options: GenerateTextOptions): Promise<GenerateTextResult> {
  const copilot = getClient();
  const model = process.env.COPILOT_MODEL || 'claude-opus-4.6';

  const systemPrompt = buildSystemPrompt(options);
  const userPrompt = buildUserPrompt(options);

  const session = await copilot.createSession({ model });

  const response = await session.sendAndWait({
    prompt: `${systemPrompt}\n\n${userPrompt}`,
  });

  const result = parseAIResponse(response?.data?.content || '');

  await copilot.stop();

  return result;
}

function buildSystemPrompt(options: GenerateTextOptions): string {
  return `You are a social media content expert. Generate engaging ${options.platform} posts.

Rules:
- Stay within ${getCharLimit(options.platform)} characters
- Tone: ${options.tone || 'professional'}
- Length: ${options.length || 'medium'}
- ${options.includeHashtags ? 'Include 3-5 relevant hashtags' : 'No hashtags'}
- ${options.includeEmojis ? 'Use emojis naturally' : 'Minimal or no emojis'}
- ${options.language ? `Write in ${options.language}` : 'Write in English'}

Respond in JSON format:
{
  "content": "The post text",
  "hashtags": ["#tag1", "#tag2"],
  "suggestions": ["Alternative version 1", "Alternative version 2"]
}`;
}

function buildUserPrompt(options: GenerateTextOptions): string {
  let prompt = `Generate a ${options.platform} post about: ${options.prompt}`;
  if (options.context) {
    prompt += `\n\nContext/Brand voice: ${options.context}`;
  }
  return prompt;
}

function getCharLimit(platform: string): number {
  const limits: Record<string, number> = {
    linkedin: 3000, facebook: 63206, instagram: 2200, youtube: 5000, tiktok: 2200,
  };
  return limits[platform] || 3000;
}

function parseAIResponse(raw: string): GenerateTextResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        content: parsed.content || raw,
        hashtags: parsed.hashtags || [],
        suggestions: parsed.suggestions || [],
      };
    }
  } catch {
    // Fallback: use raw text
  }
  return { content: raw, hashtags: [], suggestions: [] };
}

// Streaming version for real-time UI
export async function generatePostContentStream(
  options: GenerateTextOptions,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const copilot = getClient();
  const model = process.env.COPILOT_MODEL || 'claude-opus-4.6';

  const session = await copilot.createSession({ model, streaming: true });

  session.on('assistant.message_delta', (event: any) => {
    onChunk(event.data.deltaContent);
  });

  await session.sendAndWait({
    prompt: `${buildSystemPrompt(options)}\n\n${buildUserPrompt(options)}`,
  });

  await copilot.stop();
}
```

### Step 7.3: AI API Routes

`apps/server/src/routes/ai.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { generatePostContent, generatePostContentStream } from '../ai/copilot.service';
import { z } from 'zod';

export const aiRoutes = Router();
aiRoutes.use(authMiddleware);

const generateSchema = z.object({
  prompt: z.string().min(3).max(500),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok']),
  tone: z.enum(['professional', 'casual', 'humorous', 'inspirational', 'educational']).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  includeHashtags: z.boolean().optional(),
  includeEmojis: z.boolean().optional(),
  language: z.string().optional(),
  context: z.string().max(1000).optional(),
});

// Generate post content (non-streaming)
aiRoutes.post('/generate', async (req, res, next) => {
  try {
    const body = generateSchema.parse(req.body);
    const result = await generatePostContent(body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generate post content (streaming via SSE)
aiRoutes.get('/generate/stream', async (req, res) => {
  const params = generateSchema.parse(req.query);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  await generatePostContentStream(params, (chunk) => {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

// Improve existing content
aiRoutes.post('/improve', async (req, res, next) => {
  try {
    const { content, platform, instruction } = req.body;
    const result = await generatePostContent({
      prompt: `Improve this ${platform} post: "${content}"\n\nInstruction: ${instruction || 'Make it more engaging'}`,
      platform,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generate hashtag suggestions
aiRoutes.post('/hashtags', async (req, res, next) => {
  try {
    const { content, platform } = req.body;
    const result = await generatePostContent({
      prompt: `Suggest 10 relevant hashtags for this ${platform} post: "${content}"`,
      platform,
      includeHashtags: true,
    });
    res.json({ hashtags: result.hashtags });
  } catch (error) {
    next(error);
  }
});
```

### Step 7.4: Frontend AI Panel

`apps/web/src/components/composer/AIPanel.tsx`:

```tsx
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import type { PlatformType } from '@socialkeys/shared';

interface AIPanelProps {
  onInsert: (content: string) => void;
  platform: PlatformType;
}

export function AIPanel({ onInsert, platform }: AIPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [copied, setCopied] = useState<number | null>(null);

  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/ai/generate', {
        prompt, platform, tone,
        includeHashtags: true,
        includeEmojis: true,
      });
      return data;
    },
  });

  const copyToClipboard = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="w-4 h-4 text-purple-500" />
        AI Content Generator
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe what you want to post about..."
        className="w-full p-3 border border-gray-200 rounded-lg resize-none h-20 text-sm"
      />

      <div className="flex gap-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="humorous">Humorous</option>
          <option value="inspirational">Inspirational</option>
          <option value="educational">Educational</option>
        </select>

        <button
          onClick={() => generate.mutate()}
          disabled={!prompt.trim() || generate.isPending}
          className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
        >
          {generate.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate
        </button>
      </div>

      {generate.data && (
        <div className="space-y-3">
          {/* Main result */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{generate.data.content}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onInsert(generate.data.content)}
                className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium"
              >
                Use This
              </button>
              <button
                onClick={() => copyToClipboard(generate.data.content, -1)}
                className="px-3 py-1 border border-gray-300 rounded text-xs flex items-center gap-1"
              >
                {copied === -1 ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy
              </button>
            </div>
          </div>

          {/* Hashtags */}
          {generate.data.hashtags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {generate.data.hashtags.map((tag: string, i: number) => (
                <button
                  key={i}
                  onClick={() => onInsert(tag)}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Alternative suggestions */}
          {generate.data.suggestions?.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                {generate.data.suggestions.length} alternative versions
              </summary>
              <div className="mt-2 space-y-2">
                {generate.data.suggestions.map((s: string, i: number) => (
                  <div key={i} className="p-2 border border-gray-200 rounded">
                    <p className="text-xs">{s}</p>
                    <button onClick={() => onInsert(s)} className="text-xs text-purple-600 mt-1">
                      Use this version
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
```

### Phase 7: Testing Strategy

| Test | Description |
|------|------------|
| Unit: `buildSystemPrompt` | Verify prompt includes correct char limits, tone, platform |
| Unit: `parseAIResponse` | Handle valid JSON, malformed JSON, plain text responses |
| Integration: `/api/ai/generate` | Mock Copilot SDK, verify request/response format |
| Integration: `/api/ai/generate/stream` | Verify SSE event format |
| Component: `AIPanel` | Renders form, shows loading, displays results, insert works |
| E2E: AI → Compose | Generate content → insert into composer → post |

### Phase 7: Error Handling

| Scenario | Handling |
|----------|----------|
| Copilot SDK auth failure | Check GITHUB_TOKEN validity, prompt re-authentication |
| Model rate limiting | Exponential backoff with user-visible "AI is busy" message |
| Malformed AI response | Graceful fallback to raw text (no JSON parsing) |
| Empty/nonsensical response | Detect and offer "Try again" with modified prompt |
| Network timeout | 30s timeout, retry once, then show error |
| SDK unavailable (offline) | Disable AI features gracefully, show "AI unavailable" badge |

---

## Phase 8: AI Content Planner & Campaigns

**Goal:** Build the campaign management system with AI-powered content calendar generation, bulk post creation, and campaign analytics.

**Estimated Time:** 4-5 days

### Step 8.1: Campaign CRUD Routes

`apps/server/src/routes/campaigns.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, campaigns, posts, postTargets } from '@socialkeys/database';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AppError } from '../middleware/error.middleware';

export const campaignRoutes = Router();
campaignRoutes.use(authMiddleware);

const campaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// Create campaign
campaignRoutes.post('/', async (req, res, next) => {
  try {
    const body = campaignSchema.parse(req.body);
    const [campaign] = await db.insert(campaigns).values({
      userId: req.user!.id,
      ...body,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      status: body.startDate && new Date(body.startDate) <= new Date() ? 'active' : 'draft',
    }).returning();
    res.status(201).json({ campaign });
  } catch (error) {
    next(error);
  }
});

// List campaigns with post counts
campaignRoutes.get('/', async (req, res) => {
  const userCampaigns = await db.select({
    campaign: campaigns,
    totalPosts: count(posts.id),
    publishedPosts: sql<number>`sum(case when ${posts.status} = 'published' then 1 else 0 end)`,
  })
    .from(campaigns)
    .leftJoin(posts, eq(posts.campaignId, campaigns.id))
    .where(eq(campaigns.userId, req.user!.id))
    .groupBy(campaigns.id)
    .orderBy(desc(campaigns.createdAt));

  res.json({
    campaigns: userCampaigns.map(c => ({
      ...c.campaign,
      tags: c.campaign.tags ? JSON.parse(c.campaign.tags) : [],
      postCount: c.totalPosts,
      publishedCount: c.publishedPosts || 0,
    })),
  });
});

// Get campaign with its posts
campaignRoutes.get('/:id', async (req, res) => {
  const campaign = await db.query.campaigns.findFirst({
    where: and(eq(campaigns.id, req.params.id), eq(campaigns.userId, req.user!.id)),
  });
  if (!campaign) throw new AppError(404, 'Campaign not found');

  const campaignPosts = await db.query.posts.findMany({
    where: eq(posts.campaignId, campaign.id),
    orderBy: [desc(posts.scheduledAt)],
  });

  res.json({
    campaign: { ...campaign, tags: campaign.tags ? JSON.parse(campaign.tags) : [] },
    posts: campaignPosts,
  });
});

// Update campaign
campaignRoutes.patch('/:id', async (req, res, next) => {
  try {
    const body = campaignSchema.partial().parse(req.body);
    await db.update(campaigns).set({
      ...body,
      tags: body.tags ? JSON.stringify(body.tags) : undefined,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(campaigns.id, req.params.id), eq(campaigns.userId, req.user!.id)));
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Delete campaign (does not delete posts, just unlinks them)
campaignRoutes.delete('/:id', async (req, res) => {
  await db.update(posts).set({ campaignId: null })
    .where(eq(posts.campaignId, req.params.id));
  await db.delete(campaigns).where(
    and(eq(campaigns.id, req.params.id), eq(campaigns.userId, req.user!.id)),
  );
  res.json({ success: true });
});
```

### Step 8.2: AI Campaign Planner

`apps/server/src/ai/campaign-planner.service.ts`:

```typescript
import { generatePostContent } from './copilot.service';
import type { PlatformType } from '@socialkeys/shared';

export interface CampaignPlan {
  posts: PlannedPost[];
  summary: string;
  suggestedHashtags: string[];
}

export interface PlannedPost {
  content: string;
  platform: PlatformType;
  suggestedDate: string;       // ISO 8601
  suggestedTime: string;       // "09:00", "14:00", etc.
  hashtags: string[];
  mediaPrompt?: string;        // Description for AI image generation
}

export async function generateCampaignPlan(options: {
  topic: string;
  platforms: PlatformType[];
  startDate: string;
  endDate: string;
  postsPerWeek: number;
  tone: string;
  brandContext?: string;
}): Promise<CampaignPlan> {
  const result = await generatePostContent({
    prompt: `Generate a social media campaign plan.

Topic: ${options.topic}
Platforms: ${options.platforms.join(', ')}
Duration: ${options.startDate} to ${options.endDate}
Posts per week: ${options.postsPerWeek}
Tone: ${options.tone}
${options.brandContext ? `Brand context: ${options.brandContext}` : ''}

Generate a JSON array of posts with this structure:
{
  "summary": "Campaign overview",
  "suggestedHashtags": ["#tag1"],
  "posts": [
    {
      "content": "Post text",
      "platform": "linkedin",
      "suggestedDate": "2025-07-01",
      "suggestedTime": "09:00",
      "hashtags": ["#tag1"],
      "mediaPrompt": "Describe an image that would complement this post"
    }
  ]
}

Distribute posts evenly across the date range and platforms. Use optimal posting times per platform:
- LinkedIn: Tue-Thu 8-10 AM
- Facebook: Wed-Fri 1-3 PM
- Instagram: Mon-Fri 11 AM-1 PM, 7-9 PM
- YouTube: Fri-Sat 3-5 PM
- TikTok: Tue-Thu 7-9 PM`,
    platform: options.platforms[0],
    tone: options.tone as any,
  });

  try {
    const parsed = JSON.parse(result.content);
    return parsed;
  } catch {
    // Fallback: return raw content as a single-post plan
    return {
      summary: 'AI-generated campaign plan',
      suggestedHashtags: result.hashtags,
      posts: [{
        content: result.content,
        platform: options.platforms[0],
        suggestedDate: options.startDate,
        suggestedTime: '09:00',
        hashtags: result.hashtags,
      }],
    };
  }
}
```

### Step 8.3: Campaign AI API Endpoint

```typescript
// Add to ai.routes.ts
aiRoutes.post('/campaign-plan', async (req, res, next) => {
  try {
    const schema = z.object({
      topic: z.string().min(3).max(500),
      platforms: z.array(z.enum(['linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'])).min(1),
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
      postsPerWeek: z.number().min(1).max(21).default(3),
      tone: z.string().default('professional'),
      brandContext: z.string().max(1000).optional(),
    });

    const body = schema.parse(req.body);
    const plan = await generateCampaignPlan(body);
    res.json(plan);
  } catch (error) {
    next(error);
  }
});

// Convert plan to actual scheduled posts
aiRoutes.post('/campaign-plan/apply', async (req, res, next) => {
  try {
    const { campaignId, posts: plannedPosts, targetAccountIds } = req.body;

    // Bulk create posts from the plan
    for (const planned of plannedPosts) {
      const scheduledAt = `${planned.suggestedDate}T${planned.suggestedTime}:00.000Z`;
      const content = planned.hashtags?.length
        ? `${planned.content}\n\n${planned.hashtags.join(' ')}`
        : planned.content;

      // Find matching account for this platform
      const accountId = targetAccountIds[planned.platform];
      if (!accountId) continue;

      const [post] = await db.insert(posts).values({
        userId: req.user!.id,
        content,
        status: 'scheduled',
        scheduledAt,
        campaignId,
        aiGenerated: true,
        aiPrompt: planned.mediaPrompt || null,
      }).returning();

      await db.insert(postTargets).values({
        postId: post.id,
        accountId,
        platform: planned.platform,
        status: 'pending',
      });
    }

    res.json({ success: true, created: plannedPosts.length });
  } catch (error) {
    next(error);
  }
});
```

### Phase 8: UI Components

- **Campaign creation wizard:** Step 1: Name/dates → Step 2: Select platforms/accounts → Step 3: AI generation options → Step 4: Review/edit generated posts
- **Calendar view:** Monthly/weekly view with color-coded campaign posts, drag-to-reschedule
- **Bulk editor:** Spreadsheet-like view of all campaign posts for quick edits
- **Campaign progress bar:** Visual indicator of published vs pending vs failed posts

---

## Phase 9: Analytics Dashboard

**Goal:** Build analytics data collection from platform APIs and a visual dashboard with charts and insights.

**Estimated Time:** 4-5 days

### Step 9.1: Analytics Collection Service

`apps/server/src/services/analytics.service.ts`:

```typescript
import { db, postTargets, analyticsSnapshots, accounts } from '@socialkeys/database';
import { eq, and } from 'drizzle-orm';
import { getAdapter } from '../adapters/registry';
import { decrypt } from '../lib/encryption';

export class AnalyticsService {
  /**
   * Fetch analytics for all published posts of a user.
   * Called periodically (e.g., every 6 hours) or on-demand.
   */
  async syncAnalytics(userId: string): Promise<void> {
    const publishedTargets = await db.select()
      .from(postTargets)
      .innerJoin(accounts, eq(postTargets.accountId, accounts.id))
      .where(and(
        eq(postTargets.status, 'published'),
        eq(accounts.userId, userId),
      ));

    for (const row of publishedTargets) {
      const target = row.post_targets;
      const account = row.accounts;

      if (!target.platformPostId) continue;

      try {
        const adapter = getAdapter(account.platform as any);
        if (!adapter.getPostAnalytics) continue;

        const accessToken = decrypt(account.accessTokenEncrypted);
        const analytics = await adapter.getPostAnalytics(accessToken, target.platformPostId);

        if (analytics) {
          await db.insert(analyticsSnapshots).values({
            postTargetId: target.id,
            impressions: analytics.impressions,
            reach: analytics.reach,
            likes: analytics.likes,
            comments: analytics.comments,
            shares: analytics.shares,
            clicks: analytics.clicks,
            saves: analytics.saves,
            videoViews: analytics.videoViews,
            engagementRate: analytics.engagementRate,
          });
        }
      } catch (error) {
        console.error(`Analytics sync failed for ${target.id}:`, error);
      }
    }
  }
}
```

### Step 9.2: Analytics API Routes

`apps/server/src/routes/analytics.routes.ts`:

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { db, analyticsSnapshots, postTargets, posts, accounts } from '@socialkeys/database';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { AnalyticsService } from '../services/analytics.service';

export const analyticsRoutes = Router();
analyticsRoutes.use(authMiddleware);

// Get aggregated analytics
analyticsRoutes.get('/overview', async (req, res) => {
  const { from, to, platform } = req.query as Record<string, string>;
  const userId = req.user!.id;

  // Aggregate metrics across all posts in the date range
  const metrics = await db.select({
    totalImpressions: sql<number>`sum(${analyticsSnapshots.impressions})`,
    totalLikes: sql<number>`sum(${analyticsSnapshots.likes})`,
    totalComments: sql<number>`sum(${analyticsSnapshots.comments})`,
    totalShares: sql<number>`sum(${analyticsSnapshots.shares})`,
    totalClicks: sql<number>`sum(${analyticsSnapshots.clicks})`,
    totalVideoViews: sql<number>`sum(${analyticsSnapshots.videoViews})`,
    avgEngagementRate: sql<number>`avg(${analyticsSnapshots.engagementRate})`,
  })
    .from(analyticsSnapshots)
    .innerJoin(postTargets, eq(analyticsSnapshots.postTargetId, postTargets.id))
    .innerJoin(posts, eq(postTargets.postId, posts.id))
    .where(and(
      eq(posts.userId, userId),
      from ? gte(analyticsSnapshots.snapshotAt, from) : undefined,
      to ? lte(analyticsSnapshots.snapshotAt, to) : undefined,
    ));

  res.json({ metrics: metrics[0] || {} });
});

// Get analytics per post
analyticsRoutes.get('/posts', async (req, res) => {
  const { limit = '20', offset = '0' } = req.query as Record<string, string>;

  const postAnalytics = await db.select({
    postId: posts.id,
    content: posts.content,
    platform: postTargets.platform,
    publishedAt: postTargets.publishedAt,
    impressions: sql<number>`max(${analyticsSnapshots.impressions})`,
    likes: sql<number>`max(${analyticsSnapshots.likes})`,
    comments: sql<number>`max(${analyticsSnapshots.comments})`,
    shares: sql<number>`max(${analyticsSnapshots.shares})`,
    engagementRate: sql<number>`max(${analyticsSnapshots.engagementRate})`,
  })
    .from(analyticsSnapshots)
    .innerJoin(postTargets, eq(analyticsSnapshots.postTargetId, postTargets.id))
    .innerJoin(posts, eq(postTargets.postId, posts.id))
    .where(eq(posts.userId, req.user!.id))
    .groupBy(posts.id, postTargets.platform)
    .orderBy(desc(postTargets.publishedAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  res.json({ posts: postAnalytics });
});

// Get engagement timeline (for charts)
analyticsRoutes.get('/timeline', async (req, res) => {
  const { from, to, groupBy = 'day' } = req.query as Record<string, string>;

  const dateFormat = groupBy === 'hour' ? '%Y-%m-%dT%H:00:00'
    : groupBy === 'week' ? '%Y-W%W'
    : '%Y-%m-%d';

  const timeline = await db.select({
    date: sql<string>`strftime('${sql.raw(dateFormat)}', ${analyticsSnapshots.snapshotAt})`,
    impressions: sql<number>`sum(${analyticsSnapshots.impressions})`,
    likes: sql<number>`sum(${analyticsSnapshots.likes})`,
    comments: sql<number>`sum(${analyticsSnapshots.comments})`,
    shares: sql<number>`sum(${analyticsSnapshots.shares})`,
  })
    .from(analyticsSnapshots)
    .innerJoin(postTargets, eq(analyticsSnapshots.postTargetId, postTargets.id))
    .innerJoin(posts, eq(postTargets.postId, posts.id))
    .where(and(
      eq(posts.userId, req.user!.id),
      from ? gte(analyticsSnapshots.snapshotAt, from) : undefined,
      to ? lte(analyticsSnapshots.snapshotAt, to) : undefined,
    ))
    .groupBy(sql`strftime('${sql.raw(dateFormat)}', ${analyticsSnapshots.snapshotAt})`)
    .orderBy(sql`1`);

  res.json({ timeline });
});

// Trigger manual sync
analyticsRoutes.post('/sync', async (req, res) => {
  const service = new AnalyticsService();
  await service.syncAnalytics(req.user!.id);
  res.json({ success: true });
});
```

### Step 9.3: Frontend Analytics Components

Install charting library:

```bash
npm install recharts -w apps/web
```

Key components:
- `OverviewCards` — KPI cards (impressions, engagement, clicks, etc.) with trend indicators
- `EngagementChart` — Line chart showing engagement over time, filterable by platform
- `TopPostsTable` — Sortable table of best-performing posts
- `PlatformBreakdown` — Pie/donut chart of engagement by platform
- `BestTimesHeatmap` — Heatmap showing optimal posting times based on historical performance

### Phase 9: Error Handling

| Scenario | Handling |
|----------|----------|
| Platform API doesn't support analytics | Skip gracefully, show "Analytics unavailable for this platform" |
| Rate limited during analytics sync | Implement per-platform throttling, queue remaining requests |
| Zero data (new account) | Show empty state with "Post content to see analytics here" |
| Stale analytics data | Show "Last updated" timestamp, offer manual refresh |

---

## Phase 10: Electron Desktop App

**Goal:** Wrap the web app in Electron for native desktop experience with system tray, notifications, and auto-updates.

**Estimated Time:** 3-4 days

### Step 10.1: Setup Electron

```bash
mkdir -p apps/desktop
cd apps/desktop
npm init -y
npm install electron electron-builder
npm install -D @types/electron
```

`apps/desktop/package.json`:

```json
{
  "name": "@socialkeys/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist/electron.js",
  "scripts": {
    "dev": "electron .",
    "build": "tsc && electron-builder --win --mac",
    "build:win": "tsc && electron-builder --win",
    "build:mac": "tsc && electron-builder --mac"
  },
  "build": {
    "appId": "ai.socialkeys.app",
    "productName": "SocialKeys.ai",
    "directories": { "output": "release" },
    "files": ["dist/**/*"],
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.icns",
      "category": "public.app-category.social-networking"
    }
  },
  "dependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}
```

`apps/desktop/src/electron.ts`:

```typescript
import { app, BrowserWindow, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development';
const WEB_URL = isDev ? 'http://localhost:5173' : `file://${path.join(__dirname, '../web/index.html')}`;
const SERVER_URL = 'http://localhost:3001';

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e2e',
      symbolColor: '#cdd6f4',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(WEB_URL);

  // In dev, start the backend server as a child process
  if (isDev) {
    const { spawn } = await import('child_process');
    spawn('npm', ['run', 'dev', '-w', 'apps/server'], {
      stdio: 'inherit',
      shell: true,
    });
  }

  mainWindow.on('close', (event) => {
    // Minimize to tray instead of closing
    event.preventDefault();
    mainWindow?.hide();
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/tray-icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open SocialKeys.ai', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quick Compose', click: () => { mainWindow?.show(); mainWindow?.webContents.send('navigate', '/compose'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { mainWindow?.destroy(); app.quit(); } },
  ]);

  tray.setToolTip('SocialKeys.ai');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

// Show native notification when scheduled post publishes
export function showNotification(title: string, body: string) {
  new Notification({ title, body }).show();
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`apps/desktop/src/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_event, path) => callback(path));
  },
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', title, body);
  },
  platform: process.platform,
});
```

### Phase 10: Key Features

- **System tray:** Minimize to tray, quick-compose shortcut
- **Native notifications:** Post published, post failed, token expiring
- **Auto-updates:** electron-updater with GitHub Releases (future)
- **Deep links:** `socialkeys://compose?text=Hello` URI scheme
- **Offline indicator:** Banner when server is unreachable

---

## Phase 11: AI Image Generation (DALL-E 3)

**Goal:** Integrate Azure OpenAI DALL-E 3 for generating social media images directly within the composer.

**Estimated Time:** 3-4 days

### Step 11.1: Azure DALL-E Service

```bash
npm install @azure/openai -w apps/server
```

`apps/server/src/ai/dalle.service.ts`:

```typescript
import { AzureOpenAI } from 'openai';

let azureClient: AzureOpenAI | null = null;

function getClient(): AzureOpenAI {
  if (!azureClient) {
    azureClient = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-06-01',
    });
  }
  return azureClient;
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
  n?: number;                   // Number of images (1-4)
}

export interface GeneratedImage {
  url: string;
  revisedPrompt: string;
}

export async function generateImage(options: ImageGenerationOptions): Promise<GeneratedImage[]> {
  const client = getClient();

  const response = await client.images.generate({
    model: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT || 'dall-e-3',
    prompt: options.prompt,
    size: options.size || '1024x1024',
    quality: options.quality || 'standard',
    style: options.style || 'vivid',
    n: options.n || 1,
  });

  return response.data.map(img => ({
    url: img.url!,
    revisedPrompt: img.revised_prompt || options.prompt,
  }));
}

// Recommend optimal sizes for each platform
export function getRecommendedSize(platform: string): ImageGenerationOptions['size'] {
  switch (platform) {
    case 'instagram': return '1024x1024';   // Square
    case 'linkedin': return '1792x1024';    // Landscape
    case 'facebook': return '1792x1024';    // Landscape
    case 'youtube': return '1792x1024';     // Thumbnail landscape
    case 'tiktok': return '1024x1792';      // Portrait/vertical
    default: return '1024x1024';
  }
}
```

### Step 11.2: Image Generation API Endpoint

```typescript
// Add to ai.routes.ts
aiRoutes.post('/image/generate', async (req, res, next) => {
  try {
    const schema = z.object({
      prompt: z.string().min(3).max(1000),
      platform: z.string().optional(),
      size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional(),
      quality: z.enum(['standard', 'hd']).optional(),
      style: z.enum(['natural', 'vivid']).optional(),
      n: z.number().min(1).max(4).optional(),
    });

    const body = schema.parse(req.body);
    const size = body.size || (body.platform ? getRecommendedSize(body.platform) : '1024x1024');

    const images = await generateImage({ ...body, size });
    res.json({ images });
  } catch (error) {
    next(error);
  }
});
```

### Phase 11: Pricing Awareness

| Size | Quality | Approx Cost |
|------|---------|------------|
| 1024x1024 | Standard | $0.018 |
| 1024x1024 | HD | $0.040 |
| 1024x1792 | Standard | $0.020 |
| 1792x1024 | HD | $0.080 |

Display cost estimates to users before generating. Consider implementing daily generation limits per user.

---

## Phase 12: AI Video Generation (Sora 2)

**Goal:** Integrate Azure AI Foundry Sora 2 for generating short-form video content (TikTok, Reels, Shorts).

**Estimated Time:** 3-5 days (dependent on API availability)

### Step 12.1: Sora 2 Service

`apps/server/src/ai/sora.service.ts`:

```typescript
import axios from 'axios';

const SORA_ENDPOINT = process.env.AZURE_SORA_ENDPOINT;
const SORA_API_KEY = process.env.AZURE_SORA_API_KEY;
const SORA_DEPLOYMENT = process.env.AZURE_SORA_DEPLOYMENT || 'sora-2';

export interface VideoGenerationOptions {
  prompt: string;
  duration?: number;            // seconds (max 60)
  resolution?: '720p' | '1080p';
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface GeneratedVideo {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  jobId: string;
}

// Sora 2 uses asynchronous job submission
export async function submitVideoGeneration(options: VideoGenerationOptions): Promise<string> {
  const { data } = await axios.post(
    `${SORA_ENDPOINT}/openai/deployments/${SORA_DEPLOYMENT}/video/generations/jobs`,
    {
      prompt: options.prompt,
      duration: options.duration || 10,
      resolution: options.resolution || '720p',
      aspect_ratio: options.aspectRatio || '9:16',   // Vertical for social media
    },
    {
      headers: {
        'api-key': SORA_API_KEY!,
        'Content-Type': 'application/json',
      },
    },
  );

  return data.id;  // Job ID for polling
}

export async function checkVideoStatus(jobId: string): Promise<{
  status: 'processing' | 'completed' | 'failed';
  video?: GeneratedVideo;
  error?: string;
}> {
  const { data } = await axios.get(
    `${SORA_ENDPOINT}/openai/deployments/${SORA_DEPLOYMENT}/video/generations/jobs/${jobId}`,
    {
      headers: { 'api-key': SORA_API_KEY! },
    },
  );

  if (data.status === 'succeeded') {
    return {
      status: 'completed',
      video: {
        videoUrl: data.result.url,
        thumbnailUrl: data.result.thumbnail_url,
        duration: data.result.duration,
        jobId,
      },
    };
  }

  if (data.status === 'failed') {
    return { status: 'failed', error: data.error?.message || 'Video generation failed' };
  }

  return { status: 'processing' };
}

export async function waitForVideo(jobId: string, maxWaitMs = 300000): Promise<GeneratedVideo> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const result = await checkVideoStatus(jobId);
    if (result.status === 'completed' && result.video) return result.video;
    if (result.status === 'failed') throw new Error(result.error);
    await new Promise(r => setTimeout(r, 10000)); // Poll every 10s
  }
  throw new Error('Video generation timed out');
}
```

### Step 12.2: Video Generation API

```typescript
// Add to ai.routes.ts
aiRoutes.post('/video/generate', async (req, res, next) => {
  try {
    const schema = z.object({
      prompt: z.string().min(3).max(500),
      duration: z.number().min(5).max(60).optional(),
      resolution: z.enum(['720p', '1080p']).optional(),
      aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
    });

    const body = schema.parse(req.body);
    const jobId = await submitVideoGeneration(body);
    res.json({ jobId, status: 'processing' });
  } catch (error) {
    next(error);
  }
});

aiRoutes.get('/video/status/:jobId', async (req, res) => {
  const result = await checkVideoStatus(req.params.jobId);
  res.json(result);
});
```

### Phase 12: Important Notes

- **Pricing:** ~$0.10/second of generated video at 720p
- **Availability:** Public preview as of late 2025 on Azure AI Foundry. May require access request
- **Region:** Available in "East US 2" and select regions — check Azure AI Foundry Model Catalog
- **Content Safety:** Sora 2 blocks photorealistic faces, copyrighted content, and NSFW content
- **Processing Time:** Video generation can take 1-5 minutes depending on duration and resolution
- **Default to 9:16 portrait** for social media (TikTok, Reels, Shorts)

---

## Phase 13: Polish & Hardening

**Goal:** Production-readiness — security audit, performance optimization, error handling improvements, accessibility compliance, and deployment preparation.

**Estimated Time:** 5-7 days

### Step 13.1: Security Hardening

```typescript
// Content Security Policy (update helmet config)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.linkedin.com', 'https://graph.facebook.com',
        'https://open.tiktokapis.com', 'https://www.googleapis.com'],
    },
  },
}));

// Input sanitization middleware
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        (req.body as any)[key] = DOMPurify.sanitize(value);
      }
    }
  }
  next();
}
```

### Step 13.2: Performance Checklist

- [ ] **Database:** Add indexes on `userId`, `platform`, `scheduledAt`, `status` columns
- [ ] **Database:** Enable SQLite WAL mode ✅ (already done in Phase 1)
- [ ] **API:** Implement response caching for analytics (5-minute TTL)
- [ ] **API:** Add ETags for account list and post list endpoints
- [ ] **Frontend:** Code splitting per route with `React.lazy()`
- [ ] **Frontend:** Image optimization (WebP, lazy loading, srcset)
- [ ] **Frontend:** Service worker for offline mode (draft editing)
- [ ] **Bundle:** Analyze with `vite-plugin-visualizer`, tree-shake unused code
- [ ] **Media:** Implement server-side image compression before platform upload

### Step 13.3: Database Indexes

```typescript
// Add to schema files or create a migration
import { index } from 'drizzle-orm/sqlite-core';

// In accounts table
export const accountsIndexes = {
  userIdIdx: index('idx_accounts_user_id').on(accounts.userId),
  platformIdx: index('idx_accounts_platform').on(accounts.platform),
};

// In posts table
export const postsIndexes = {
  userIdIdx: index('idx_posts_user_id').on(posts.userId),
  statusIdx: index('idx_posts_status').on(posts.status),
  scheduledAtIdx: index('idx_posts_scheduled_at').on(posts.scheduledAt),
  campaignIdIdx: index('idx_posts_campaign_id').on(posts.campaignId),
};

// In post_targets
export const postTargetsIndexes = {
  postIdIdx: index('idx_post_targets_post_id').on(postTargets.postId),
  statusIdx: index('idx_post_targets_status').on(postTargets.status),
};

// In analytics_snapshots
export const analyticsIndexes = {
  postTargetIdIdx: index('idx_analytics_post_target_id').on(analyticsSnapshots.postTargetId),
  snapshotAtIdx: index('idx_analytics_snapshot_at').on(analyticsSnapshots.snapshotAt),
};
```

### Step 13.4: Error Monitoring

```typescript
// Global error boundary for React
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Future: send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### Step 13.5: Accessibility Audit

- [ ] All images have alt text (including AI-generated images)
- [ ] Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] All interactive elements keyboard-accessible (Tab, Enter, Escape)
- [ ] Focus management: trap focus in modals, return focus on close
- [ ] Screen reader: aria-live regions for dynamic content (post status, upload progress)
- [ ] Reduced motion: respect `prefers-reduced-motion` for animations
- [ ] Form labels: all inputs have associated labels or aria-label
- [ ] Error announcements: form validation errors announced to screen readers

### Step 13.6: Production Deployment Checklist

```
Pre-deploy:
  ☐ All tests passing (unit, integration, e2e)
  ☐ TypeScript strict mode — zero type errors
  ☐ No console.log in production code (use proper logger)
  ☐ Environment variables documented and validated at startup
  ☐ Database migration tested on production-like data
  ☐ Rate limiting configured and tested
  ☐ CORS configured for production domain only
  ☐ All secrets rotated and not in git history
  ☐ Content Security Policy headers configured
  ☐ SSL/TLS configured

Build:
  ☐ Frontend: npm run build → dist/
  ☐ Backend: tsc → dist/
  ☐ Database: drizzle-kit migrate (production DB)
  ☐ Electron: electron-builder (if desktop release)

Post-deploy:
  ☐ Health endpoint responding: /api/health
  ☐ Scheduler running (check logs)
  ☐ OAuth callbacks working with production URLs
  ☐ Media upload working with production storage
  ☐ DALL-E 3 / Copilot SDK working with production keys
```

### Phase 13: Final Testing Matrix

| Category | Tool | What to Test |
|----------|------|-------------|
| Unit | Vitest | All service functions, adapters, utilities |
| API Integration | Vitest + Supertest | All REST endpoints (happy path + error cases) |
| Component | Vitest + React Testing Library | All UI components (render, interaction, accessibility) |
| E2E | Playwright | Critical flows: login → connect account → compose → post → verify |
| Performance | Lighthouse | Frontend: Performance > 90, Accessibility > 90 |
| Security | npm audit + Snyk | Zero high/critical vulnerabilities |
| Accessibility | axe-core | Zero violations in automated scan |
| Cross-platform | Manual | Test on Chrome, Firefox, Safari, Edge |

---

## Appendix: Quick Reference

### Key npm Commands

```bash
# Development
npm run dev                         # Start frontend + backend
npm run dev -w apps/web             # Start frontend only
npm run dev -w apps/server          # Start backend only

# Database
npm run db:push -w packages/database    # Push schema changes
npm run db:studio -w packages/database  # Open Drizzle Studio GUI
npm run db:seed -w packages/database    # Seed with demo data

# Testing
npm run test                        # Run all tests
npm run test -- --watch             # Watch mode
npm run typecheck                   # TypeScript type checking

# Building
npm run build                       # Build all packages
npm run build -w apps/web           # Build frontend
npm run build -w apps/server        # Build backend

# Linting
npm run lint                        # ESLint
npm run lint -- --fix               # Auto-fix
```

### Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/:platform/connect` | Get OAuth URL |
| GET | `/api/auth/:platform/callback` | OAuth callback |
| GET | `/api/accounts` | List connected accounts |
| POST | `/api/accounts/:id/refresh` | Refresh token |
| GET | `/api/posts` | List posts |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/:id` | Update draft |
| DELETE | `/api/posts/:id` | Delete post |
| POST | `/api/posts/:id/media` | Upload media |
| GET | `/api/campaigns` | List campaigns |
| POST | `/api/campaigns` | Create campaign |
| GET | `/api/analytics/overview` | Dashboard metrics |
| GET | `/api/analytics/timeline` | Engagement timeline |
| POST | `/api/ai/generate` | AI text generation |
| POST | `/api/ai/image/generate` | DALL-E image gen |
| POST | `/api/ai/video/generate` | Sora video gen |
| POST | `/api/ai/campaign-plan` | AI campaign planning |

### Dependencies Summary

**Runtime Dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3 | UI framework |
| react-router-dom | ^7.0 | Routing |
| @tanstack/react-query | ^5.0 | Server state management |
| zustand | ^5.0 | Client state management |
| tailwindcss | ^4.0 | CSS utility framework |
| express | ^4.21 | HTTP server |
| better-sqlite3 | ^11.7 | SQLite database |
| drizzle-orm | ^0.44 | SQL ORM |
| @github/copilot-sdk | ^0.1 | AI text generation |
| @azure/openai | ^1.0 | DALL-E 3 image generation |
| axios | ^1.7 | HTTP client |
| zod | ^3.23 | Schema validation |
| jsonwebtoken | ^9.0 | JWT auth |
| bcryptjs | ^2.4 | Password hashing |
| multer | ^1.4 | File uploads |
| date-fns | ^4.0 | Date utilities |
| recharts | ^2.14 | Charts |
| lucide-react | ^0.460 | Icons |

---

*This plan is a living document. Update it as requirements evolve and APIs change.*
*Generated for SocialKeys.ai by GitHub Copilot · June 2025*
