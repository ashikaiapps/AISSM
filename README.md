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
- [ ] Post scheduling engine
- [ ] AI content generation (GitHub Copilot SDK + Claude Opus 4.6)
- [ ] AI campaign planner
- [ ] Analytics dashboard
- [ ] Image generation (Azure DALL-E 3)
- [ ] Video generation (Azure Sora 2)

## License

Private — © AshikAI Apps
