# SocialKeys.ai (AISSM)

**AI-powered social media cross-posting app.** Connect once, publish everywhere — LinkedIn, Facebook, Instagram, YouTube Shorts, and TikTok from a single interface.

## Features

- **5 Platform Support** — Real OAuth 2.0 authentication and real posting APIs for LinkedIn, Facebook Pages, Instagram (images + Reels), YouTube Shorts, and TikTok
- **Multi-Account** — Connect multiple accounts per platform (e.g., multiple Instagram business accounts)
- **Cross-Post** — Write one caption, select target accounts, publish to all simultaneously
- **Drag & Drop Media** — Upload images and videos with drag & drop, reorderable thumbnails, platform-aware validation
- **Live Post Preview** — See exactly how your post will look on each platform before publishing (LinkedIn, Facebook, Instagram, YouTube Shorts, TikTok)
- **Electron Desktop App** — Runs as a native desktop app with embedded API server — stable callback URLs forever
- **Encrypted Token Storage** — AES-256-GCM encryption for all OAuth tokens at rest
- **Extensible Adapter Pattern** — Add new platforms by implementing a single `PlatformAdapter` interface
- **Modern Stack** — TypeScript everywhere, React + Tailwind v4 frontend, Express API, SQLite + Drizzle ORM

## Architecture

```
socialkeys.ai/
├── apps/
│   ├── api/          # Express REST API (port 3001)
│   │   ├── src/
│   │   │   ├── adapters/     # Platform adapters (linkedin, facebook, instagram, youtube, tiktok)
│   │   │   ├── config/       # Environment config + validation
│   │   │   ├── db/           # Drizzle schema, migrations, SQLite connection
│   │   │   ├── routes/       # Auth (OAuth), accounts, posts, media, settings
│   │   │   └── services/     # Token encryption (AES-256-GCM)
│   │   └── drizzle/          # Generated SQL migrations
│   ├── web/          # React + Vite + Tailwind v4 (port 5173)
│   │   └── src/
│   │       ├── components/   # MediaDropZone, PostPreview, ConnectWizard
│   │       └── pages/        # Dashboard, Setup, Accounts, Composer
│   └── desktop/      # Electron desktop app
│       ├── src/              # Main process + preload
│       └── scripts/          # Dev + build scripts
├── packages/
│   └── shared/       # Shared TypeScript types (Platform, PostContent, etc.)
├── data/             # SQLite database + uploads (gitignored)
└── docs/             # Spec files and implementation plans
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Edit `.env` with your platform credentials:
- **LinkedIn**: [developers.linkedin.com](https://www.linkedin.com/developers/) — Create app, get Client ID/Secret
- **Facebook/Instagram**: [developers.facebook.com](https://developers.facebook.com/) — Create app, get App ID/Secret
- **YouTube**: [console.cloud.google.com](https://console.cloud.google.com/) — Enable YouTube Data API v3, create OAuth credentials
- **TikTok**: [developers.tiktok.com](https://developers.tiktok.com/) — Create app, get Client Key/Secret

Generate secure secrets:
```bash
# SESSION_SECRET (any 32+ char string)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize database
```bash
npx tsx apps/api/src/db/migrate.ts
```

### 4. Start development servers
```bash
# Terminal 1: API server
npx tsx apps/api/src/server.ts

# Terminal 2: Web dev server
cd apps/web && npx vite
```

Open **http://localhost:5173** — the Vite dev server proxies `/api/*` and `/auth/*` to the Express API.

### 5. (Optional) Run as Electron Desktop App

```bash
# Make sure API + Web are running first (step 4), then:
cd apps/desktop
node scripts/build-main.js
npx electron .
```

Or use the all-in-one command from the project root:
```bash
npm run dev:desktop
```

### Building a Distributable

```bash
# Full build: compile API + web + Electron, then package
npm run dist:desktop:win   # Windows (.exe installer + portable)
# npm run dist:desktop       # Current platform
```

The packaged app bundles everything — API server, web frontend, SQLite — into a single installable. Your team just runs the installer, no Node.js required.

## Platform Status

| Platform | OAuth | Text Post | Image | Video | Approval Required |
|----------|-------|-----------|-------|-------|-------------------|
| **LinkedIn** | ✅ | ✅ | 🔜 | 🔜 | ❌ None — instant |
| **Facebook** | ✅ | ✅ | 🔜 | 🔜 | ⏳ App Review (5-10 days) |
| **Instagram** | ✅ | N/A* | ✅ | ✅ Reels | ⏳ App Review (5-10 days) |
| **YouTube** | ✅ | N/A* | N/A | ✅ Shorts | ❌ Test mode instant |
| **TikTok** | ✅ | N/A* | N/A | ✅ | ⏳ Audit (2-6 weeks) |

*Instagram requires media (no text-only posts). YouTube and TikTok are video-only platforms.

## Account Types Guide

Each platform supports different account types with different capabilities:

### LinkedIn
| Account Type | Author URN | Scope Required | Approval |
|---|---|---|---|
| **Personal Profile** | `urn:li:person:{id}` | `w_member_social` | ✅ Instant |
| **Company Page** | `urn:li:organization:{id}` | `w_organization_social` | ⏳ Marketing Developer Platform |

- Personal profile posting works immediately with "Share on LinkedIn" product
- Company Page posting requires applying for **Marketing Developer Platform** in the LinkedIn developer portal
- After OAuth, the app discovers both your personal profile AND any Company Pages you admin
- You must be a **Page Admin** to post as a Company Page
- **Note:** Creating a LinkedIn developer app requires associating it with a LinkedIn Page — this is just a registration requirement and doesn't affect personal profile posting

### Facebook
| Account Type | How It Posts | Scope Required | Notes |
|---|---|---|---|
| **Facebook Page** | As the Page itself | `pages_manage_posts` | Requires Page admin role |
| **Personal Profile** | ❌ Not supported | — | Facebook deprecated personal profile posting via API in 2024 |

- Facebook **only supports Page posting** through the API — personal profile posting was removed
- After OAuth, the app discovers all Pages you manage and lets you select which to connect
- Each Page gets its own long-lived access token (~60 days, auto-refreshable)
- You must be a **Page Admin** or **Editor** for the Page

### Instagram
| Account Type | How It Posts | Scope Required | Notes |
|---|---|---|---|
| **Business Account** | Container-based publish | `instagram_basic`, `instagram_content_publish` | Must be linked to a Facebook Page |
| **Creator Account** | Container-based publish | Same | Must be linked to a Facebook Page |
| **Personal Account** | ❌ Not supported | — | Must convert to Business or Creator |

- Instagram accounts must be **Business** or **Creator** type (convert in Instagram settings → Account → Switch to Professional Account)
- Must be **linked to a Facebook Page** (Instagram settings → Linked Accounts)
- Uses same Meta OAuth as Facebook — one login discovers both Facebook Pages and Instagram accounts
- Container-based 2-step publish: create media container → wait for processing → publish
- Supports images and Reels (video)

### YouTube
| Account Type | How It Posts | Scope Required | Notes |
|---|---|---|---|
| **YouTube Channel** | Video upload (Shorts) | `youtube.upload` | Works in test mode (100 users) |

- Posts are **video-only** (YouTube Shorts = vertical ≤60s with #Shorts)
- Resumable upload API — works with large files
- Test mode: limited to 100 authorized users (no approval needed)
- Production: requires Google API compliance review
- 10,000 quota units/day (1 upload ≈ 1,600 units)

### TikTok
| Account Type | How It Posts | Scope Required | Notes |
|---|---|---|---|
| **TikTok Account** | FILE_UPLOAD (video) | `video.publish` | Unaudited = SELF_ONLY drafts |

- Posts are **video-only**
- Unaudited apps can only post as `SELF_ONLY` (visible only to you / drafts)
- Full public posting requires **TikTok audit** (2-6 weeks)
- Uses FILE_UPLOAD method (works locally, unlike PULL_FROM_URL)
- `client_key` (not `client_id`) in TikTok's API

### Threads (Coming Soon)
| Account Type | How It Posts | Scope Required | Notes |
|---|---|---|---|
| **Threads Profile** | Text + media posts | `threads_basic`, `threads_content_publish` | Uses Meta OAuth |

- Threads API launched in 2024 — uses the same Meta developer app as Facebook/Instagram
- Supports text posts, images, videos, carousels, and link posts
- Same OAuth flow as Instagram — just needs additional Threads scopes

## API Endpoints

### OAuth
- `GET /auth/:platform/start` — Redirect to platform's OAuth consent screen
- `GET /auth/callback/:platform` — Handle OAuth callback, store encrypted tokens

### Accounts
- `GET /api/v1/accounts` — List connected accounts
- `DELETE /api/v1/accounts/:id` — Disconnect an account

### Posts
- `POST /api/v1/posts` — Create and publish a post to selected accounts
- `GET /api/v1/posts` — List recent posts with per-account status
- `GET /api/v1/posts/:id` — Get a single post with details

### Health
- `GET /health` — API health check

## Adding a New Platform

1. Create `apps/api/src/adapters/newplatform.ts` implementing `PlatformAdapter`
2. Add env vars to `apps/api/src/config/env.ts`
3. Register in `apps/api/src/adapters/index.ts`
4. Add platform to the `Platform` type in `packages/shared/src/index.ts`

The adapter interface requires: `getAuthUrl`, `exchangeCode`, `refreshToken`, `publishPost`, and `validateContent`.

## Spec Documents

The `docs/` folder contains the planning and specification documents generated during the multi-model design process:

| Document | Description |
|----------|-------------|
| [`platform-account-types.md`](docs/platform-account-types.md) | **Account types guide** — Personal vs Page vs Business for each platform, rate limits |
| [`plan-super-v2.md`](docs/plan-super-v2.md) | **Definitive spec** — Opus 4.6-reviewed merged plan with all critical fixes |
| [`plan-super.md`](docs/plan-super.md) | Merged super plan synthesized from GPT-5.4 + Gemini 3 Pro outputs |
| [`plan-assessment.md`](docs/plan-assessment.md) | Opus 4.6 critical review — 6 critical, 10 high, 11 medium findings |
| [`plan-opus.md`](docs/plan-opus.md) | Claude Opus 4.6 full implementation plan (5,688 lines) |
| [`plan-gpt5.md`](docs/plan-gpt5.md) | GPT-5.4 detailed plan with Drizzle schemas and CI/CD |
| [`plan-gemini.md`](docs/plan-gemini.md) | Gemini 3 Pro concise plan with platform registration table |

## Tech Stack

- **Runtime**: Node.js 20+ / TypeScript
- **API**: Express 5
- **Database**: SQLite (via better-sqlite3) + Drizzle ORM
- **Frontend**: React 19 + Vite 6 + Tailwind CSS v4
- **Desktop**: Electron 35 with electron-builder
- **Auth**: OAuth 2.0 per platform (no third-party auth libraries)
- **Security**: AES-256-GCM token encryption, CSRF state tokens
- **Monorepo**: npm workspaces

## Future Roadmap

- [x] Drag & drop media upload
- [x] Live post preview per platform
- [x] Electron desktop app
- [x] LinkedIn personal + Company Page posting
- [ ] Threads integration (Meta OAuth — same app)
- [ ] InspirationFeed — track competitors, trending topics, Reddit/HN/news
- [ ] Post scheduling engine (50+ posts/day across accounts)
- [ ] AI content generation (GitHub Copilot SDK + Claude Opus 4.6)
- [ ] Bulk composer — create multiple post variants from one inspiration
- [ ] AI campaign planner
- [ ] Analytics dashboard
- [ ] Image generation (Azure DALL-E 3)
- [ ] Video generation (Azure Sora 2)

## License

Private — © AshikAI Apps
