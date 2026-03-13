# SocialKeys.ai — Definitive Super Plan v2

> **v2 changelog**: This revision fixes all critical issues identified in the assessment: adds database indexes, corrects LinkedIn OAuth scopes (`r_liteprofile` → `openid`/`profile`/`email`), fixes Drizzle boolean types, adds `workspace_members` table, adds structured logging from Phase 1, adds rate limiting, documents TikTok media upload strategy, adds Instagram Reels support, explicitly scopes Facebook to Page-only posting, adds security hardening, adds backup/observability/resilience concerns, and improves UI/UX wireframes with accessibility and component library decisions.

This document is the definitive merged implementation plan for **SocialKeys.ai**. It keeps GPT-5.4's detailed, implementation-ready structure as the canonical source, while preserving Gemini's best product and platform-operations insights, and incorporating Claude's architectural review corrections. The plan is intentionally **local-first, mock-first, and zero-external-infra for development**: a new contributor should be able to clone the repo, copy `.env.example`, run migrations, seed data, and start the full stack in roughly five minutes without Redis, cloud storage, or live social credentials.

---

## A. Model Comparison

GPT-5.4 is the stronger implementation backbone: it provides the production-grade monorepo shape, exact commands, mock-first local development model, full Drizzle schema progression, REST API surface, CI/CD pipeline, milestone definitions, and platform-specific API notes with endpoints, auth flow expectations, and registration details. Gemini is stronger on synthesis and operator usability: its platform registration table is the fastest way to coordinate approvals across vendors, and its wireframe descriptions keep the product experience concrete and accessible. Claude (Opus/Sonnet) contributed the architectural review identifying critical schema bugs, deprecated API scopes, missing security controls, and platform-specific gotchas. GPT-5.4 under-emphasizes quick comparative registration guidance and some UX framing; Gemini under-specifies schema depth, API surface, CI/CD, and hardening. The definitive plan therefore uses GPT-5.4 as the canonical source, explicitly grafts in Gemini's registration matrix, UX framing, and product-level implementation cues, and applies Claude's corrections throughout.

---

## B. Local Dev Quickstart

The canonical developer path is npm workspaces with SQLite, inline workers, and mock publishing enabled by default. Teams that prefer pnpm may mirror the same scripts, but the documented commands below remain the source of truth because they align with the phase plan and keep clone-to-running deterministic.

> **Prerequisites**: Node.js 20 LTS, npm 10+, Git. Optional: FFmpeg (for video transcoding in Phase 4+).

### Commands

```bash
git clone <repo-url> SocialKeys.ai
cd SocialKeys.ai

# copy environment and install
cp .env.example .env          # Windows: copy .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed               # seed dev data (users, workspace, sample drafts)
npm run dev
```

### Expected dev URLs

- Web app: `http://localhost:5173`
- API: `http://localhost:3001`
- API health: `http://localhost:3001/health`
- API docs (Swagger): `http://localhost:3001/api-docs`
- OAuth callback base: `http://localhost:3001/auth/callback/:platform`
- Drizzle Studio: run `npm run db:studio` → `https://local.drizzle.studio`

### Minimum env vars for local mock mode

```dotenv
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
PORT=3001
DATABASE_URL=./data/socialkeys.dev.sqlite
SESSION_SECRET=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ENCRYPTION_KEY=<generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CORS_ORIGIN=http://localhost:5173
PUBLISH_MODE=mock
ENABLE_AI_TEXT=false
ENABLE_AI_IMAGES=false
ENABLE_VIDEO_GEN=false
LOG_LEVEL=debug
```

> **⚠️ IMPORTANT**: The server will refuse to start if `SESSION_SECRET` is `replace-me` or `ENCRYPTION_KEY` is not exactly 64 hex characters (32 bytes). Run the generation commands above.

### Mock/sandbox behavior

- `PUBLISH_MODE=mock` → adapters never hit real APIs; responses stored as simulated successes/failures.
- `SOCIAL_SANDBOX_ONLY=true` → only use platform test accounts / private posting / draft posting.
- `ENABLE_SCHEDULER=true` with `WORKER_INLINE=true` → run jobs in the API process for simple local dev.
- `USE_MSW=true` in web tests → mock REST API and OAuth callback states.

### Dev tooling

- **API hot reload**: `tsx watch` via `npm run dev:api` — restarts on file changes.
- **DB viewer**: `npm run db:studio` opens Drizzle Studio for browsing tables.
- **API docs**: Swagger UI auto-generated from Zod schemas at `/api-docs`.
- **Seed data**: `npm run db:seed` creates a demo user, workspace, sample social accounts, and draft posts.

---

## C. Tech Stack & Conventions

SocialKeys.ai should be built as a local-first TypeScript monorepo with a zero-external-infrastructure development path, production-shaped module boundaries, and explicit room for later scale-out.

| Layer | Canonical choice | Notes |
| --- | --- | --- |
| Frontend | React 18.3+, Vite 5.x, TailwindCSS 3.4+, shadcn/ui (Radix primitives), React Router, TanStack Query, Zustand | Fast SPA, accessible components via Radix, responsive UI, strong dev ergonomics |
| Backend | Node.js 20 LTS, TypeScript 5.6+, Express 5.x, Pino + pino-http | Simple REST API, structured logging from day one, scheduler host, OAuth callback surface |
| Database | SQLite + `better-sqlite3` + Drizzle ORM 0.36+ | Zero infra locally, WAL mode enabled, Electron-friendly, migration path to Postgres later |
| Adapters | Shared `@socialkeys/adapters` package | All provider calls must route through platform adapters |
| Scheduling | Inline worker + cron polling for MVP; BullMQ only as an optional future upgrade | Keeps local setup Redis-free while preserving a queue abstraction |
| AI text | GitHub Copilot SDK (`@github/copilot-sdk`) with Claude Opus 4.6 primary and GPT-4.1 fallback | Captioning, rewriting, planner, repurposing |
| AI media | Azure OpenAI image generation first; gated video provider later | Keep mock/stub modes available in every environment |
| UI components | shadcn/ui + Radix UI primitives + Tailwind | Accessible, composable, keyboard-navigable components out of the box |
| Notifications | sonner (toast library) | Lightweight, accessible toast notifications |
| Quality | Vitest, React Testing Library, Supertest, Playwright, MSW | Unit + integration + end-to-end coverage without hitting live APIs |
| Desktop | Electron after web/API flows are hardened | Reuse the same React UI and local storage conventions |

### Package/runtime choices

- Node.js: **20 LTS**
- TypeScript: **5.6+**
- React: **18.3+**
- Vite: **5.x**
- Express: **5.1+** (stable since March 2025, default on npm)
- Drizzle ORM: **0.36+**
- better-sqlite3: **9.x / 10.x**
- TailwindCSS: **3.4+**
- shadcn/ui: **latest** (Radix UI primitives)
- Pino: **9.x** (structured logging)
- sonner: **latest** (toast notifications)
- Vitest + RTL + Playwright

### Core engineering rules

- TypeScript strict mode on everywhere.
- Never store OAuth tokens unencrypted.
- All provider calls go through adapter interfaces.
- Every publish action writes an immutable attempt record.
- Media validation happens **before** queueing.
- Every async workflow must be idempotent.
- Structured logging with correlation IDs on every request from Phase 1.
- SQLite WAL mode enabled at database initialization.
- `updatedAt` columns updated via Drizzle middleware helper on every write.
- Boot-time validation: fail fast if secrets are placeholder values.
- React error boundaries wrap every major feature area (composer, previews, analytics, campaigns).

---

## D. Monorepo Structure

```text
SocialKeys.ai/
  apps/
    web/
      src/
        app/
        components/
          ui/               # shadcn/ui components
          error-boundaries/  # React error boundary wrappers
        features/
        hooks/
        lib/
        pages/
        routes/
        styles/
      public/
      index.html
      vite.config.ts
    api/
      src/
        app.ts
        server.ts
        config/
          env.ts            # Zod-validated env with boot-time secret checks
          logger.ts         # Pino logger setup
        db/
          index.ts          # WAL mode enabled here
          migrate.ts
          seed.ts           # Dev seed data
          triggers.ts       # updatedAt triggers
        middleware/
          rate-limit.ts     # express-rate-limit config
          request-id.ts     # correlation ID middleware
          error-handler.ts  # global error handler with structured logging
          auth.ts
        modules/
          auth/
          accounts/
          adapters/
          composer/
          media/
          posts/
          schedule/
          campaigns/
          analytics/
          ai/
          webhooks/         # NEW: platform webhook receivers
        jobs/
        workers/
        clients/
        utils/
      drizzle.config.ts
  packages/
    database/
      src/
        schema/
          core.ts           # users, sessions, workspaces, workspace_members
          accounts.ts       # social_accounts, oauth_tokens
          content.ts        # post_drafts, media_assets, draft_targets, draft_media, draft_snapshots
          scheduling.ts     # scheduled_posts, publish_jobs
          publishing.ts     # provider_publish_records
          campaigns.ts      # campaigns, campaign_items
          analytics.ts      # analytics_snapshots
          ai.ts             # ai_generations, ai_media_generations, ai_video_generations
          audit.ts          # audit_logs
          indexes.ts        # ALL database indexes in one file
        migrations/
        client.ts
        middleware.ts       # updatedAt helper
    shared/
      src/
        types/
        constants/
        validators/
    adapters/
      src/
        base/
          types.ts
          SocialAdapter.ts
          MockAdapter.ts
        linkedin/
        facebook/
        instagram/
        youtube/
        tiktok/
        registry.ts
    ai/
      src/
        copilot/
        prompts/
        planning/
        safety/
    ui/
      src/
        components/
        tokens/
    config/
      eslint/
      typescript/
      tailwind/
  scripts/
    generate-secrets.ts     # Helper to generate SESSION_SECRET and ENCRYPTION_KEY
    backup-db.ts            # SQLite backup script
  data/
  tests/
    e2e/
    fixtures/
```

### Workspace package names

- `@socialkeys/web`
- `@socialkeys/api`
- `@socialkeys/database`
- `@socialkeys/shared`
- `@socialkeys/adapters`
- `@socialkeys/ai`
- `@socialkeys/ui`
- `@socialkeys/config`

---

## E. Environment Variable Reference

Keep a single root `.env` as the canonical development configuration. All apps and packages should read from that root file via shared config helpers so local setup stays predictable. The reference below is the full environment contract and should be treated as the baseline `.env.example`.

```dotenv
# ═══════════════════════════════════════════
# CORE
# ═══════════════════════════════════════════
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
PORT=3001
CORS_ORIGIN=http://localhost:5173
# Use forward slashes for cross-platform compatibility
DATABASE_URL=./data/socialkeys.dev.sqlite
# REQUIRED: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Server will NOT start if this is "replace-me"
SESSION_SECRET=replace-me
# REQUIRED: Must be exactly 64 hex chars (32 bytes). Generate same as above.
# Server will NOT start if this is a placeholder
ENCRYPTION_KEY=replace-with-64-hex-chars
LOG_LEVEL=debug

# ═══════════════════════════════════════════
# FEATURE FLAGS
# ═══════════════════════════════════════════
PUBLISH_MODE=mock
SOCIAL_SANDBOX_ONLY=true
ENABLE_SCHEDULER=true
ENABLE_AI_TEXT=false
ENABLE_AI_IMAGES=false
ENABLE_VIDEO_GEN=false
ENABLE_ELECTRON=false

# ═══════════════════════════════════════════
# UPLOADS / MEDIA
# ═══════════════════════════════════════════
UPLOAD_DIR=./data/uploads
MAX_UPLOAD_MB=512
FFMPEG_PATH=
IMAGE_PUBLIC_BASE_URL=http://localhost:3001/media

# ═══════════════════════════════════════════
# WORKER / SCHEDULER
# ═══════════════════════════════════════════
WORKER_INLINE=true
WORKER_ID=dev-worker-1
WORKER_POLL_MS=15000
JOB_LOCK_TIMEOUT_MS=120000
JOB_MAX_ATTEMPTS=5

# ═══════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AI_MAX_REQUESTS=10

# ═══════════════════════════════════════════
# COOKIE / SESSION CONFIG
# ═══════════════════════════════════════════
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax
COOKIE_SECURE=false
COOKIE_MAX_AGE_MS=604800000

# ═══════════════════════════════════════════
# LINKEDIN
# OAuth: OpenID Connect (r_liteprofile is DEPRECATED since Aug 2023)
# Scopes: openid, profile, email, w_member_social
# ═══════════════════════════════════════════
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3001/auth/callback/linkedin
LINKEDIN_API_VERSION=202501

# ═══════════════════════════════════════════
# META / FACEBOOK / INSTAGRAM
# NOTE: Only Facebook PAGE posting is supported.
# Personal profile and Group posting via API was deprecated in 2024.
# ═══════════════════════════════════════════
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3001/auth/callback/facebook
META_GRAPH_VERSION=v21.0
INSTAGRAM_USE_FACEBOOK_LOGIN=true

# ═══════════════════════════════════════════
# YOUTUBE
# ═══════════════════════════════════════════
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/youtube
YOUTUBE_UPLOAD_PRIVACY_STATUS=private
YOUTUBE_DEFAULT_CATEGORY_ID=22

# ═══════════════════════════════════════════
# TIKTOK
# Media upload: Use FILE_UPLOAD (chunked) for local-first.
# PULL_FROM_URL requires publicly accessible HTTPS domain with verified ownership.
# ═══════════════════════════════════════════
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3001/auth/callback/tiktok
TIKTOK_USE_SANDBOX=true
TIKTOK_UPLOAD_METHOD=FILE_UPLOAD
TIKTOK_MEDIA_PULL_DOMAIN=

# ═══════════════════════════════════════════
# GITHUB COPILOT SDK
# ═══════════════════════════════════════════
ENABLE_COPILOT_SDK=false
COPILOT_MODEL_PRIMARY=claude-opus-4.6
COPILOT_MODEL_FALLBACK=gpt-4.1

# ═══════════════════════════════════════════
# AZURE OPENAI IMAGES
# ═══════════════════════════════════════════
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_IMAGE_DEPLOYMENT=dalle3
AZURE_OPENAI_IMAGE_MODEL=dalle3

# ═══════════════════════════════════════════
# FUTURE VIDEO
# ═══════════════════════════════════════════
AI_VIDEO_PROVIDER=stub
AI_VIDEO_API_KEY=

# ═══════════════════════════════════════════
# BACKUP
# ═══════════════════════════════════════════
BACKUP_DIR=./data/backups
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE_CRON=0 */6 * * *
```
---

## F. Platform Registration Checklist

Use the table below as the fastest operator view, then follow the detailed setup steps for each platform. Keep all local redirect URIs pointed at the API app, use sandbox/test accounts whenever possible, and plan vendor approvals early because Meta and TikTok can easily become schedule drivers.

> **⚠️ CRITICAL NOTES**:
> - LinkedIn `r_liteprofile` was **deprecated August 2023**. Use OpenID Connect scopes: `openid`, `profile`, `email`.
> - Facebook **only supports Page posting** via API. Personal profile and Group posting was deprecated in 2024.
> - TikTok requires a **publicly accessible HTTPS URL** for `PULL_FROM_URL` media upload. Use `FILE_UPLOAD` (chunked) for local development.
> - Instagram Reels are published via `media_type=REELS` — same API, different container type.

| Platform | URL | Required Info | Permissions/Scopes | Approval Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **LinkedIn** | [LinkedIn Developers](https://www.linkedin.com/developers/) | App Name, Logo, Privacy Policy URL | `openid`, `profile`, `email`, `w_member_social` | Instant (Basic) |
| **Facebook/Instagram** | [Meta for Developers](https://developers.facebook.com/) | Business Verification (for some features) | `pages_manage_posts`, `instagram_basic`, `instagram_content_publish` | 1-2 Weeks (Business Verification) |
| **YouTube** | [Google Cloud Console](https://console.cloud.google.com/) | Project creation, OAuth consent screen | `https://www.googleapis.com/auth/youtube.upload` | Instant (Test mode), Weeks (Production quota) |
| **TikTok** | [TikTok for Developers](https://developers.tiktok.com/) | App details, Use case description | `video.upload`, `video.publish`, `user.info.basic` | 1-3 Weeks |

### LinkedIn

**Step-by-step setup**

1. Create app in LinkedIn Developer portal.
2. Add logo, legal name, privacy policy URL, app use case.
3. Configure redirect URI: `http://localhost:3001/auth/callback/linkedin`
4. Enable **Sign In with LinkedIn using OpenID Connect** product.
5. Add **Share on LinkedIn** product.
6. If posting to orgs, request organization scopes and complete approval questionnaire.
7. Link app to a company page you manage for org tests.

**Detailed requirements, scopes, and timeline**

- URL: `https://developer.linkedin.com/`
- Need:
  - app name, company page, logo, privacy policy URL, terms URL
  - redirect URIs
  - business justification for org scopes
- Scopes/products:
  - Sign In with LinkedIn using OpenID Connect
  - Share on LinkedIn
  - `openid`, `profile`, `email` (replaces deprecated `r_liteprofile` and `r_emailaddress`)
  - `w_member_social`
  - `w_organization_social` if posting as org
- User info endpoint: `GET https://api.linkedin.com/v2/userinfo`
- Approval timeline:
  - member posting can be quick/self-service
  - org/marketing scopes can require manual approval; plan **1–3+ weeks**

### Facebook & Instagram (Meta)

> **IMPORTANT**: Facebook API only supports posting to **Pages**. Personal profile posting and Group posting via API was fully deprecated in 2024. Do not attempt to build profile posting — it will not work.

**Step-by-step Meta app setup**

1. Create Meta Developer account.
2. Create **Business** type app.
3. Add Facebook Login for Business + Pages API.
4. Set OAuth redirect URI: `http://localhost:3001/auth/callback/facebook`
5. Add test users / testers.
6. Request advanced access for page permissions.
7. Submit screencast and written use case for App Review.

**Instagram-specific enablement**

1. Create/update Meta Business app.
2. Add Instagram API product.
3. Convert IG account to Professional (Business or Creator).
4. Link IG account to Facebook Page.
5. Add tester/admin accounts.
6. Request advanced access and submit app review.
7. Advise users to complete Page Publishing Authorization (PPA) proactively.

**Detailed requirements, scopes, and timeline**

- URL: `https://developers.facebook.com/`
- Need:
  - Business app
  - privacy policy URL
  - screencast for app review
  - test users/testers
  - business verification for advanced access in some cases
- Permissions:
  - Facebook: `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_read_user_engagement`, `publish_video`
  - Instagram: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`
- Supported content types:
  - Facebook Pages: text, image, video, link, scheduled posts
  - Instagram: single image, carousel (multi-image), single video, Reels (`media_type=REELS`)
  - **NOT supported**: Facebook personal profiles, Facebook Groups, Instagram Stories
- Graph API version strategy:
  - Pin to a specific version (e.g., `v21.0`)
  - Meta deprecates versions ~2 years after release
  - Monitor `https://developers.facebook.com/docs/graph-api/changelog/` quarterly
  - Budget one sprint per year for version bump testing
- Approval timeline:
  - App Review often **5+ business days per review round**

### YouTube

**Step-by-step setup**

1. Create Google Cloud project.
2. Enable YouTube Data API v3.
3. Configure OAuth consent screen.
4. Add redirect URI: `http://localhost:3001/auth/callback/youtube`
5. Request app verification for sensitive scopes when moving beyond internal/test users.

**Detailed requirements, scopes, and timeline**

- URL: `https://console.cloud.google.com/`
- Need:
  - OAuth consent screen
  - support email
  - privacy policy
  - verified domain for production
- Scopes:
  - `https://www.googleapis.com/auth/youtube.upload`
- YouTube Shorts detection:
  - Same upload API as regular videos
  - Classified as Short when: **vertical aspect ratio (9:16)**, **≤60 seconds duration**, and `#Shorts` in title or description
  - No separate endpoint or API flag
- Approval timeline:
  - internal/testing fast
  - public verification for sensitive scopes can take **days to weeks**

### TikTok

> **⚠️ CRITICAL**: TikTok's `PULL_FROM_URL` method requires media hosted on a **publicly accessible HTTPS domain** with **verified domain ownership** in the TikTok Developer Portal. This is incompatible with local-first development. Use `FILE_UPLOAD` (chunked upload) as the primary upload method. Reserve `PULL_FROM_URL` for production deployments with a CDN.

**Step-by-step setup**

1. Create TikTok developer account.
2. Create org-owned app.
3. Add Login Kit + Content Posting API.
4. For `FILE_UPLOAD`: no domain verification needed.
5. For `PULL_FROM_URL`: verify domain/URL prefix for media pull in Developer Portal.
6. Enable Direct Post configuration.
7. Create sandbox and add target users (up to 5 sandboxes, 10 users each).
8. Request `video.publish` scope and submit audit.

**Detailed requirements, scopes, and timeline**

- URL: `https://developers.tiktok.com/`
- Need:
  - organization app
  - privacy policy and terms
  - sandbox setup
  - UX audit compliance (preview before post, user consent, correct account display)
- Scopes:
  - `video.publish` (direct posting)
  - `video.upload` (if app-side drafts desired)
- Media upload methods:
  - **`FILE_UPLOAD`** (chunked): Upload video chunks directly. Works locally, no domain needed. **Recommended for local-first dev.**
  - **`PULL_FROM_URL`**: TikTok fetches from your URL. Requires verified public HTTPS domain. **Production only with CDN.**
- Approval timeline:
  - sandbox immediate
  - audit/review for public posting typically **1–3+ weeks**
  - **Unaudited apps can only publish in private viewing mode**

---

## G. Database Schema

### Schema design principles (v2 additions)

1. **All boolean columns use `integer` with `mode: "boolean"`** — not `text`. SQLite stores booleans as INTEGER 0/1.
2. **Every table with `updatedAt` gets automatic timestamp updates** via Drizzle middleware or SQLite triggers.
3. **Composite unique constraints are defined in Drizzle**, not just in raw SQL.
4. **Indexes are defined explicitly** for all frequently-queried columns.
5. **WAL mode is enabled** at database initialization for concurrent read performance.
6. **`workspace_members` table exists from Phase 1** to support multi-user workspaces.

### Database initialization

```ts
// apps/api/src/db/index.ts
import Database from "better-sqlite3";

const db = new Database(process.env.DATABASE_URL);

// Enable WAL mode for concurrent reads
db.pragma("journal_mode = WAL");
// Enable foreign keys (not on by default in SQLite)
db.pragma("foreign_keys = ON");
// Reasonable busy timeout for concurrent access
db.pragma("busy_timeout = 5000");
```

### Phase 1 core schema

```ts
import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  expiresAtIdx: index("sessions_expires_at_idx").on(table.expiresAt),
}));

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// NEW: Workspace membership for multi-user support
export const workspaceMembers = sqliteTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").$type<"owner" | "admin" | "editor" | "viewer">().notNull().default("editor"),
  invitedAt: text("invited_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  acceptedAt: text("accepted_at"),
}, (table) => ({
  workspaceUserUnique: uniqueIndex("workspace_members_ws_user_unique").on(table.workspaceId, table.userId),
  userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
}));
```

### Phase 2 account and token schema

```ts
export const socialAccounts = sqliteTable("social_accounts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").$type<"linkedin" | "facebook" | "instagram" | "youtube" | "tiktok">().notNull(),
  externalAccountId: text("external_account_id").notNull(),
  externalAccountName: text("external_account_name").notNull(),
  handle: text("handle"),
  accountType: text("account_type"),
  avatarUrl: text("avatar_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), // FIXED: integer, not text
  lastHealthCheck: text("last_health_check"), // NEW: track token validity
  healthStatus: text("health_status").$type<"healthy" | "expiring" | "needs_reauth" | "unknown">().default("unknown"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  // FIXED: composite unique constraint present in Drizzle
  workspacePlatformAccountUnique: uniqueIndex("social_accounts_ws_platform_ext_unique")
    .on(table.workspaceId, table.platform, table.externalAccountId),
  workspaceIdx: index("social_accounts_workspace_id_idx").on(table.workspaceId),
  platformIdx: index("social_accounts_platform_idx").on(table.platform),
}));

export const oauthTokens = sqliteTable("oauth_tokens", {
  id: text("id").primaryKey(),
  socialAccountId: text("social_account_id").notNull().references(() => socialAccounts.id, { onDelete: "cascade" }),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  tokenType: text("token_type").notNull().default("Bearer"),
  scopes: text("scopes").notNull(),
  expiresAt: text("expires_at"),
  refreshExpiresAt: text("refresh_expires_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  socialAccountIdIdx: index("oauth_tokens_social_account_id_idx").on(table.socialAccountId),
  expiresAtIdx: index("oauth_tokens_expires_at_idx").on(table.expiresAt),
}));
```

### Phases 3–13 schema

```ts
export const postDrafts = sqliteTable("post_drafts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  bodyText: text("body_text").notNull(),
  status: text("status").$type<"draft" | "ready" | "scheduled" | "publishing" | "published" | "failed">().notNull().default("draft"),
  contentType: text("content_type").notNull().default("text"),
  version: integer("version").notNull().default(1), // NEW: optimistic concurrency for multi-tab safety
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("post_drafts_workspace_id_idx").on(table.workspaceId),
  statusIdx: index("post_drafts_status_idx").on(table.status),
  authorIdx: index("post_drafts_author_user_id_idx").on(table.authorUserId),
}));

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  checksumSha256: text("checksum_sha256").notNull(),
  isOrphaned: integer("is_orphaned", { mode: "boolean" }).notNull().default(false), // NEW: for garbage collection
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("media_assets_workspace_id_idx").on(table.workspaceId),
  checksumIdx: index("media_assets_checksum_idx").on(table.checksumSha256),
}));

export const draftTargets = sqliteTable("draft_targets", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  socialAccountId: text("social_account_id").notNull().references(() => socialAccounts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  targetKind: text("target_kind").notNull(),
  targetRef: text("target_ref").notNull(),
  position: integer("position").notNull().default(0),
}, (table) => ({
  draftIdIdx: index("draft_targets_draft_id_idx").on(table.draftId),
  socialAccountIdIdx: index("draft_targets_social_account_id_idx").on(table.socialAccountId),
}));

export const draftMedia = sqliteTable("draft_media", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  mediaAssetId: text("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  purpose: text("purpose").notNull().default("primary"),
}, (table) => ({
  draftIdIdx: index("draft_media_draft_id_idx").on(table.draftId),
}));

// FIXED: Was missing from canonical schema in v1
export const draftSnapshots = sqliteTable("draft_snapshots", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  draftIdIdx: index("draft_snapshots_draft_id_idx").on(table.draftId),
}));

export const scheduledPosts = sqliteTable("scheduled_posts", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  scheduledFor: text("scheduled_for").notNull(),
  timezone: text("timezone").notNull(),
  status: text("status").notNull().default("queued"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusScheduledForIdx: index("scheduled_posts_status_scheduled_for_idx").on(table.status, table.scheduledFor),
  workspaceIdx: index("scheduled_posts_workspace_id_idx").on(table.workspaceId),
}));

export const publishJobs = sqliteTable("publish_jobs", {
  id: text("id").primaryKey(),
  scheduledPostId: text("scheduled_post_id").references(() => scheduledPosts.id, { onDelete: "cascade" }),
  draftTargetId: text("draft_target_id").notNull().references(() => draftTargets.id, { onDelete: "cascade" }),
  dedupeKey: text("dedupe_key").notNull().unique(),
  status: text("status").$type<"queued" | "locked" | "running" | "succeeded" | "failed_retryable" | "failed_terminal" | "dead_letter">().notNull().default("queued"),
  runAfter: text("run_after").notNull(),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  lockedBy: text("locked_by"),
  lockedAt: text("locked_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  statusRunAfterIdx: index("publish_jobs_status_run_after_idx").on(table.status, table.runAfter),
  lockedByIdx: index("publish_jobs_locked_by_idx").on(table.lockedBy),
  scheduledPostIdIdx: index("publish_jobs_scheduled_post_id_idx").on(table.scheduledPostId),
}));

export const providerPublishRecords = sqliteTable("provider_publish_records", {
  id: text("id").primaryKey(),
  publishJobId: text("publish_job_id").notNull().references(() => publishJobs.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  providerPostId: text("provider_post_id"),
  providerContainerId: text("provider_container_id"),
  providerMediaId: text("provider_media_id"),
  providerResponseJson: text("provider_response_json").notNull().default("{}"),
  publishedUrl: text("published_url"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  publishJobIdIdx: index("provider_publish_records_publish_job_id_idx").on(table.publishJobId),
  platformIdx: index("provider_publish_records_platform_idx").on(table.platform),
}));

export const aiGenerations = sqliteTable("ai_generations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  inputJson: text("input_json").notNull(),
  outputJson: text("output_json").notNull(),
  modelName: text("model_name").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("ai_generations_workspace_id_idx").on(table.workspaceId),
}));

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  objective: text("objective"),
  audience: text("audience"),
  tone: text("tone"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  status: text("status").notNull().default("draft"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("campaigns_workspace_id_idx").on(table.workspaceId),
  statusIdx: index("campaigns_status_idx").on(table.status),
}));

export const campaignItems = sqliteTable("campaign_items", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  draftId: text("draft_id").references(() => postDrafts.id, { onDelete: "set null" }),
  plannedFor: text("planned_for"),
  channelMixJson: text("channel_mix_json").notNull().default("[]"),
  pillar: text("pillar"),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  campaignIdIdx: index("campaign_items_campaign_id_idx").on(table.campaignId),
}));

export const analyticsSnapshots = sqliteTable("analytics_snapshots", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  socialAccountId: text("social_account_id").references(() => socialAccounts.id, { onDelete: "set null" }),
  providerPublishRecordId: text("provider_publish_record_id").references(() => providerPublishRecords.id, { onDelete: "set null" }),
  metricDate: text("metric_date").notNull(),
  metricsJson: text("metrics_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceDateIdx: index("analytics_snapshots_ws_date_idx").on(table.workspaceId, table.metricDate),
}));

export const aiMediaGenerations = sqliteTable("ai_media_generations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  draftId: text("draft_id").references(() => postDrafts.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  revisedPrompt: text("revised_prompt"),
  provider: text("provider").notNull().default("azure-openai"),
  modelName: text("model_name").notNull(),
  status: text("status").notNull().default("submitted"),
  resultMediaAssetId: text("result_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const aiVideoGenerations = sqliteTable("ai_video_generations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  draftId: text("draft_id").references(() => postDrafts.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  prompt: text("prompt").notNull(),
  settingsJson: text("settings_json").notNull().default("{}"),
  status: text("status").notNull().default("queued"),
  outputMediaAssetId: text("output_media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id"),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  ipAddress: text("ip_address"),                    // NEW
  userAgent: text("user_agent"),                    // NEW
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  workspaceIdx: index("audit_logs_workspace_id_idx").on(table.workspaceId),
  actionIdx: index("audit_logs_action_idx").on(table.action),
  entityIdx: index("audit_logs_entity_type_entity_id_idx").on(table.entityType, table.entityId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));
```

### updatedAt middleware

```ts
// packages/database/src/middleware.ts
// Call this in every service that performs UPDATE operations
export function withUpdatedAt<T extends Record<string, unknown>>(data: T): T & { updatedAt: string } {
  return { ...data, updatedAt: new Date().toISOString() };
}
```
---

## H. REST API Surface

The REST API should remain explicit, stable, and mock-friendly. In development, the same surface must operate cleanly against mock adapters, simulated provider responses, and seeded SQLite data. API documentation is auto-generated from Zod schemas via Swagger UI at `/api-docs`.

```text
# Health & readiness
GET    /health
GET    /ready

# Auth
GET    /api/v1/me
GET    /api/v1/auth/:platform/start
GET    /api/v1/auth/:platform/callback
POST   /api/v1/auth/logout

# Accounts
GET    /api/v1/accounts
POST   /api/v1/accounts/:platform/connect
POST   /api/v1/accounts/:id/disconnect
GET    /api/v1/accounts/:id/health          # NEW: check token validity

# Workspace members (NEW)
GET    /api/v1/workspace/members
POST   /api/v1/workspace/members/invite
PATCH  /api/v1/workspace/members/:id/role
DELETE /api/v1/workspace/members/:id

# Drafts
GET    /api/v1/drafts
POST   /api/v1/drafts
GET    /api/v1/drafts/:id
PATCH  /api/v1/drafts/:id
DELETE /api/v1/drafts/:id                   # NEW
POST   /api/v1/drafts/:id/media
POST   /api/v1/drafts/:id/publish
POST   /api/v1/drafts/:id/schedule

# Scheduling
GET    /api/v1/scheduled-posts
DELETE /api/v1/scheduled-posts/:id          # NEW: cancel scheduled post
GET    /api/v1/publish-jobs/:id

# AI
POST   /api/v1/ai/generate-text
POST   /api/v1/ai/rewrite
POST   /api/v1/ai/campaign-plan
POST   /api/v1/ai/generate-image

# Campaigns
GET    /api/v1/campaigns
POST   /api/v1/campaigns
PATCH  /api/v1/campaigns/:id
DELETE /api/v1/campaigns/:id                # NEW

# Analytics
GET    /api/v1/analytics/overview
GET    /api/v1/analytics/platforms
GET    /api/v1/analytics/campaigns

# Webhooks (NEW: receive async platform status updates)
POST   /api/v1/webhooks/meta
POST   /api/v1/webhooks/tiktok

# Data export (NEW)
GET    /api/v1/export/drafts
GET    /api/v1/export/campaigns
GET    /api/v1/export/analytics

# Dev-only (gated by NODE_ENV=development)
POST   /api/v1/dev/run-queue-now
POST   /api/v1/dev/seed
POST   /api/v1/dev/reset-db

# API docs
GET    /api-docs                             # Swagger UI
GET    /api-docs/json                        # OpenAPI JSON spec
```

---

## I. Security Architecture (NEW SECTION)

### Secrets management

- `SESSION_SECRET`: Must be cryptographically random, minimum 32 bytes. Generated via `crypto.randomBytes(32).toString('hex')`.
- `ENCRYPTION_KEY`: Must be exactly 32 bytes (64 hex chars). Used for AES-256-GCM token encryption.
- **Boot-time validation**: Server refuses to start with placeholder values. Error message includes generation command.

### Token encryption

```ts
// AES-256-GCM encryption for OAuth tokens
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string, key: Buffer): string {
  const data = Buffer.from(ciphertext, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}
```

### Cookie configuration

```ts
{
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
}
```

### CSRF protection

- Use `csurf` or double-submit cookie pattern for all state-changing browser routes.
- API routes authenticated via session cookie must include CSRF token in `X-CSRF-Token` header.
- Token generated per session and embedded in the initial page load.

### Content Security Policy

```ts
// Helmet CSP configuration
{
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // needed for Tailwind
    imgSrc: ["'self'", "data:", "blob:", "https://*.linkedin.com", "https://*.fbcdn.net", "https://*.googleusercontent.com", "https://*.tiktokcdn.com"],
    connectSrc: ["'self'", "https://api.linkedin.com", "https://graph.facebook.com", "https://graph.instagram.com", "https://www.googleapis.com", "https://open.tiktokapis.com"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  }
}
```

### Rate limiting

```ts
// apps/api/src/middleware/rate-limit.ts
import rateLimit from "express-rate-limit";

// General API rate limit
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "AI rate limit exceeded. Try again in a minute." },
});

// Auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts." },
});
```

### Input validation

- All request bodies validated with Zod schemas before processing.
- User-generated content (post body, campaign names, titles) sanitized for XSS via `DOMPurify` on the client and `sanitize-html` on the server before rendering in previews.
- File uploads validated by MIME type, file extension, magic bytes, and file size.

---

## J. Observability & Resilience (NEW SECTION)

### Structured logging (from Phase 1)

```ts
// apps/api/src/config/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  serializers: pino.stdSerializers,
});

// apps/api/src/middleware/request-id.ts
import { randomUUID } from "crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
});
```

### Graceful shutdown

```ts
// apps/api/src/server.ts
const server = app.listen(PORT);

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  // Stop accepting new connections
  server.close();
  // Drain in-flight publish jobs (wait up to 30s)
  await scheduler.drain(30_000);
  // Close database connection
  db.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

### SQLite backup strategy

```ts
// scripts/backup-db.ts
import Database from "better-sqlite3";
import { join } from "path";

const db = new Database(process.env.DATABASE_URL);
const backupDir = process.env.BACKUP_DIR || "./data/backups";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = join(backupDir, `socialkeys-${timestamp}.sqlite`);

// SQLite online backup (safe during concurrent access with WAL mode)
db.backup(backupPath).then(() => {
  // Verify integrity
  const backup = new Database(backupPath);
  const result = backup.pragma("integrity_check");
  if (result[0].integrity_check !== "ok") {
    throw new Error("Backup integrity check failed");
  }
  backup.close();
  console.log(`Backup created: ${backupPath}`);
});
```

### Media garbage collection

```ts
// Background job: runs daily, removes orphaned media files
// A media asset is orphaned if:
// 1. It has no draft_media references
// 2. It has no ai_media_generations references
// 3. It was created more than 30 days ago
// Mark as orphaned first, delete on next run if still orphaned
```

### Error recovery

- **Stale lock recovery**: On startup, reclaim any `publish_jobs` where `locked_at` is older than `JOB_LOCK_TIMEOUT_MS`. Reset to `queued` if under max attempts, `dead_letter` otherwise.
- **Provider API changes**: Adapter methods should catch unexpected 4xx/5xx responses and log the full response body for debugging. Never silently swallow provider errors.
- **Database corruption detection**: Run `PRAGMA integrity_check` on startup in production. Log warning if issues found.

---

## K. Phase-by-Phase Implementation

The following 13 phases inherit from the original plan with all corrections and additions applied.

## Phase 1 — Foundation

### Goal

Create the monorepo, shared config, API/web apps, SQLite/Drizzle wiring, auth/session foundation, structured logging, rate limiting, and CI-grade scripts.

### Exact steps with commands

#### 1. Initialize the workspace

```bash
mkdir -p apps packages scripts data
npm init -y
npm pkg set private=true
npm pkg set 'workspaces[0]=apps/*'
npm pkg set 'workspaces[1]=packages/*'
```

#### 2. Create root tooling

```bash
npm install -D typescript tsx vite vitest @vitest/coverage-v8 playwright concurrently cross-env rimraf \
  eslint @eslint/js typescript-eslint prettier prettier-plugin-tailwindcss \
  tailwindcss postcss autoprefixer
```

#### 3. Create shared packages

```bash
mkdir -p packages/config packages/shared packages/database packages/ui packages/adapters packages/ai
mkdir -p packages/database/src/schema packages/shared/src packages/adapters/src packages/ai/src
```

#### 4. Scaffold API app

```bash
mkdir -p apps/api apps/api/src apps/api/src/modules apps/api/src/middleware apps/api/src/config apps/api/src/db
npm install -w apps/api express cors helmet morgan zod cookie-parser express-session \
  better-sqlite3 drizzle-orm drizzle-kit pino pino-http express-rate-limit swagger-ui-express
npm install -D -w apps/api @types/express @types/cors @types/morgan @types/cookie-parser \
  @types/express-session @types/swagger-ui-express supertest @types/supertest pino-pretty
```

#### 5. Scaffold web app

```bash
npm create vite@latest apps/web -- --template react-ts
npm install -w apps/web react-router-dom @tanstack/react-query zustand clsx tailwind-merge \
  zod react-hook-form sonner
npm install -D -w apps/web tailwindcss postcss autoprefixer @testing-library/react \
  @testing-library/jest-dom @testing-library/user-event msw
npx tailwindcss init -p
# Install shadcn/ui
npx shadcn-ui@latest init
```

#### 6. Add root scripts

```bash
npm pkg set scripts.dev="concurrently \"npm:dev:web\" \"npm:dev:api\""
npm pkg set scripts.dev:web="npm run dev -w apps/web"
npm pkg set scripts.dev:api="tsx watch apps/api/src/server.ts"
npm pkg set scripts.build="npm run build --workspaces"
npm pkg set scripts.test="npm run test --workspaces"
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.db:generate="drizzle-kit generate --config apps/api/drizzle.config.ts"
npm pkg set scripts.db:migrate="tsx apps/api/src/db/migrate.ts"
npm pkg set scripts.db:seed="tsx apps/api/src/db/seed.ts"
npm pkg set scripts.db:studio="drizzle-kit studio --config apps/api/drizzle.config.ts"
npm pkg set scripts.db:backup="tsx scripts/backup-db.ts"
npm pkg set scripts.generate:secrets="tsx scripts/generate-secrets.ts"
```

### Files to create first

- `package.json`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `.env.example`
- `scripts/generate-secrets.ts` — outputs random SESSION_SECRET and ENCRYPTION_KEY
- `apps/api/src/app.ts`
- `apps/api/src/server.ts` — with graceful shutdown handlers
- `apps/api/src/config/env.ts` — Zod-validated env with secret checks
- `apps/api/src/config/logger.ts` — Pino logger
- `apps/api/src/middleware/request-id.ts` — correlation ID
- `apps/api/src/middleware/rate-limit.ts` — express-rate-limit
- `apps/api/src/middleware/error-handler.ts` — global error handler
- `apps/api/src/db/index.ts` — WAL mode, foreign keys
- `apps/api/src/db/migrate.ts`
- `apps/api/src/db/seed.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/app/router.tsx`
- `apps/web/src/components/error-boundaries/AppErrorBoundary.tsx`
- `packages/database/src/client.ts`
- `packages/database/src/schema/core.ts` — includes `workspace_members`
- `packages/database/src/middleware.ts` — `updatedAt` helper
- `packages/shared/src/types.ts`

### Local development setup

- Use SQLite file: `./data/socialkeys.dev.sqlite`
- Enable WAL mode and foreign keys on connection
- Use cookie session in dev, secure cookie only in prod
- Add `/health`, `/ready`, `/api-docs`
- Start with local mock auth providers before real OAuth
- Run `npm run db:seed` to populate demo data

### UI/UX design considerations

- Shell layout with left nav, top workspace switcher, persistent save/status bar.
- Empty state on dashboard: "Connect your first account".
- App must work at 1280px desktop first, then 768px tablet; composer usable on 390px mobile.
- Use shadcn/ui components (built on Radix primitives) for buttons, dialogs, dropdowns, tabs, tooltips.
- Dark mode support via Tailwind `dark:` classes and a theme toggle in the user menu.
- Keyboard navigation for primary actions; visible focus rings via Tailwind `ring` utilities.
- Color contrast AA minimum (verified with shadcn/ui defaults).
- Toast notifications via sonner for success/error/info feedback.
- React error boundaries around each major feature section.

### Accessibility strategy

- **Component library**: shadcn/ui provides ARIA attributes, keyboard handling, and focus management out of the box.
- **Focus traps**: Radix Dialog, Popover, and DropdownMenu handle focus trapping automatically.
- **Screen reader testing**: Test with VoiceOver (macOS) and NVDA (Windows) for critical flows (login, compose, publish).
- **Skip links**: Add "Skip to main content" link for keyboard users.
- **Reduced motion**: Respect `prefers-reduced-motion` media query; disable animations when set.
- **Touch targets**: Minimum 44x44px for all interactive elements on mobile.

### Testing strategy

- Unit: schema validators, env parsing, utility functions, secret validation.
- Integration: `/health`, session middleware, DB boot with WAL mode, rate limit middleware.
- E2E: app loads, login mock, create workspace.

### Error handling / edge cases

- Missing env → fail fast on boot with actionable error message.
- Placeholder secrets → refuse to start; print generation command.
- SQLite file locked → show recovery instructions, retry backoff.
- Schema drift → migration version check on boot.
- Bad session cookie → clear cookie and redirect to login.

---

## Phase 2 — Adapter framework + multi-account

### Goal

Define adapter contracts, OAuth token storage/refresh with PKCE, account connection flow, health checking, and multi-account selection per platform.

### Exact steps with commands

```bash
npm install -w apps/api openid-client jose
mkdir -p packages/adapters/src/base packages/adapters/src/registry
mkdir -p apps/api/src/modules/auth apps/api/src/modules/accounts apps/api/src/modules/adapters
```

### Files to create

- `packages/adapters/src/base/types.ts`
- `packages/adapters/src/base/SocialAdapter.ts`
- `packages/adapters/src/base/MockAdapter.ts`
- `packages/adapters/src/registry.ts`
- `apps/api/src/modules/auth/oauth.service.ts`
- `apps/api/src/modules/auth/pkce.ts` — PKCE helper
- `apps/api/src/modules/accounts/accounts.controller.ts`
- `apps/api/src/modules/accounts/health-check.service.ts`
- `apps/web/src/features/accounts/*`

### Recommended adapter contract (IMPROVED)

```ts
export interface SocialAdapter {
  platform: "linkedin" | "facebook" | "instagram" | "youtube" | "tiktok";

  // OAuth flow
  connectUrl(input: ConnectUrlInput): Promise<string>;
  exchangeCode(input: ExchangeCodeInput): Promise<ConnectedAccount>;
  refreshToken(account: StoredAccount): Promise<RefreshedToken>;
  revokeAccess?(account: StoredAccount): Promise<void>;            // NEW

  // Publishing
  validateMedia(input: ValidateMediaInput): Promise<MediaValidationResult>;
  publish(input: PublishInput): Promise<PublishResult>;
  getPostStatus?(input: PostStatusInput): Promise<PostStatus>;     // NEW: for async publishing (IG containers)
  deletePost?(input: DeletePostInput): Promise<void>;              // NEW: user-facing delete

  // Account info
  getAccountProfile(input: AccessTokenInput): Promise<AccountProfile>;
  getAccountCapabilities?(input: AccessTokenInput): Promise<PlatformCapabilities>; // NEW
  getRateLimit?(input: AccessTokenInput): Promise<RateLimitStatus | null>;
  healthCheck?(input: AccessTokenInput): Promise<HealthCheckResult>; // NEW: periodic token validation
}

export interface PlatformCapabilities {
  supportsText: boolean;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsReels: boolean;
  supportsCarousel: boolean;
  supportsScheduling: boolean;
  maxTextLength: number;
  maxImages: number;
  maxVideoSizeBytes: number;
  maxVideoDurationMs: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
}
```

### OAuth with PKCE

All platforms that support PKCE should use it. For platforms that don't (some legacy OAuth2), fall back to basic authorization code flow.

```ts
// apps/api/src/modules/auth/pkce.ts
import { randomBytes, createHash } from "crypto";

export function generatePKCE() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, method: "S256" as const };
}
```

- Store `state` + PKCE `verifier` in a server-side table with 10-minute TTL.
- Encrypt tokens with AES-256-GCM using `ENCRYPTION_KEY`.
- Refresh tokens in background when expiry < 15 minutes.

### Account health checking

- Background job runs every 6 hours (configurable).
- For each connected account, calls `healthCheck()` or attempts a lightweight API call.
- Updates `socialAccounts.healthStatus` to `healthy`, `expiring`, or `needs_reauth`.
- Sends toast notification to workspace members when an account needs reauth.

### UI/UX considerations

- Account Manager page with:
  - platform cards (unconnected: greyed with "Connect" CTA; connected: full details)
  - connected account rows: avatar, name, handle, account-type badge (Page/Profile/Channel/Business)
  - health status indicator: 🟢 Healthy, 🟡 Expiring, 🔴 Needs Reauth, ⚪ Unknown
  - quick actions: "Reconnect", "Refresh token", "Set default", "Disconnect"
  - last health check timestamp
- Bulk filters: active, warning, error, re-auth-required
- Account picker in composer: single-select per platform initially, multi-select across platforms

### Testing strategy

- Unit: token encryption/decryption round-trip, OAuth state validation, PKCE generation, adapter registry.
- Integration: connect callback success/failure, duplicate account prevention, health check updates.
- E2E: connect mock LinkedIn + second Instagram account.

### Error handling / edge cases

- User connects same account twice → upsert, do not duplicate.
- Token expires and refresh fails → mark `needs_reauth`, notify user.
- Workspace member disconnects shared account → enforce role check (admin+).
- OAuth state mismatch → hard fail, audit log, no partial account creation.
- PKCE verifier expired → clear and restart OAuth flow with fresh state.

---

## Phase 3 — LinkedIn & Facebook adapters

### Goal

Ship first production channels: LinkedIn text/image/video posts and Facebook **Page** text/image/video/link posts.

> **IMPORTANT**: Facebook only supports Page posting via API. Personal profile and Group posting was deprecated in 2024.

### Exact steps with commands

```bash
mkdir -p packages/adapters/src/linkedin packages/adapters/src/facebook
npm install -w apps/api undici form-data
```

### API connection details

#### LinkedIn

- Developer portal: `https://developer.linkedin.com/`
- Docs: `https://learn.microsoft.com/en-us/linkedin/`
- OAuth products: **Sign In with LinkedIn using OpenID Connect**, **Share on LinkedIn**
- OAuth scopes (CORRECTED):
  - `openid`, `profile`, `email` (for user identity — **NOT** `r_liteprofile`)
  - `w_member_social` (for posting as member)
  - `w_organization_social` for company page posting
  - `r_organization_social` if reading org social state
- User info endpoint: `GET https://api.linkedin.com/v2/userinfo`
- Post endpoint:
  - `POST https://api.linkedin.com/rest/posts`
- Required headers:
  - `Authorization: Bearer <token>`
  - `X-Restli-Protocol-Version: 2.0.0`
  - `Linkedin-Version: YYYYMM` (use current valid version, e.g., `202501`)
- Media upload:
  - use LinkedIn Images API / Videos API first, then reference returned URNs in post payload
- Rate limits:
  - app-specific throttling; expect `429`; implement exponential backoff and visible retry state

#### Facebook Pages API

- Developer portal: `https://developers.facebook.com/`
- Page posting docs: `https://developers.facebook.com/docs/pages-api/posts/`
- **Only Page posting is supported**. Personal profile and Group posting via API was deprecated in 2024.
- Required permissions:
  - `pages_manage_posts`
  - `pages_read_engagement`
  - `pages_manage_engagement`
  - `pages_read_user_engagement`
  - `publish_video` for video
- User must have Page tasks:
  - `CREATE_CONTENT`, `MANAGE`, `MODERATE`
- Endpoints:
  - `POST https://graph.facebook.com/{version}/{page_id}/feed`
  - `POST https://graph.facebook.com/{version}/{page_id}/photos`
  - `POST https://graph.facebook.com/{version}/{page_id}/videos`
- Scheduling via API:
  - `published=false`
  - `scheduled_publish_time`
  - allowed window: **10 minutes to 30 days**
- Graph API versioning:
  - Pin to a known stable version (e.g., `v21.0`)
  - Versions expire ~2 years after release
  - Monitor changelog quarterly: `https://developers.facebook.com/docs/graph-api/changelog/`

### Testing strategy

- Unit: LinkedIn/Facebook payload mapping, token refresh logic.
- Integration: mock provider API with MSW-node (prefer over `nock` for consistency with frontend mocks).
- E2E: create draft, select accounts, publish in mock mode.

### Error handling / edge cases

- LinkedIn org post without org scope → disable org targets, show upgrade CTA.
- Facebook Page task missing → show reconnect with admin requirement.
- Media asset accepted by app but rejected by provider → store provider reason and actionable fix.
- Partial multi-platform publish → per-target status, never fail entire batch silently.

---

## Phase 4 — Post composer & media handling

### Goal

Build the main authoring experience: rich composer, account selector, media validation/transcoding pipeline, previews, draft autosave with optimistic concurrency.

### Exact steps with commands

```bash
npm install -w apps/web @dnd-kit/core @dnd-kit/sortable dayjs
npm install -w apps/api sharp ffmpeg-static fluent-ffmpeg multer sanitize-html
npm install -D -w apps/api @types/multer @types/sanitize-html
mkdir -p apps/web/src/features/composer apps/api/src/modules/composer apps/api/src/modules/media
```

### UI/UX design considerations (DETAILED)

#### Composer layout (Desktop 1280px+)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Back] Draft Title [editable]          [Saved ✓] [Schedule] [Pub]│
├────────────┬──────────────────────┬─────────────────────────────────┤
│            │                      │                                 │
│  EDITOR    │   SETTINGS           │   PREVIEW                      │
│            │                      │                                 │
│ [Text area │ Workspace: [picker]  │ ┌─ LinkedIn ──────────────┐   │
│  with AI   │ Accounts: [multi]    │ │ Professional text card   │   │
│  assist    │ Campaign: [tag]      │ │ with image/video chip   │   │
│  buttons]  │                      │ └──────────────────────────┘   │
│            │ Validation:          │                                 │
│ AI Actions:│ ✅ LinkedIn: 2800/3k │ ┌─ Facebook Page ─────────┐   │
│ ✨ Generate│ ⚠️ FB: missing image │ │ Page header + body +    │   │
│ 🔄 Rewrite │ ❌ IG: no JPEG       │ │ media block             │   │
│ ✏️ Fix gram│                      │ └──────────────────────────┘   │
│            │ Schedule:            │                                 │
│ Media tray:│ [Date] [Time] [TZ]  │ [Switch preview: LI|FB|IG|YT] │
│ [drag/drop │ Best time: Tue 9am  │                                 │
│  reorder]  │                      │                                 │
│            │ Char counts:         │ Aggregate validation:           │
│ [+ Upload] │ LI: 2800/3000       │ 2 platforms ready               │
│ [🤖 AI img]│ FB: 2800/63206      │ 1 warning                       │
│            │ IG: 1200/2200        │ 1 error                         │
├────────────┴──────────────────────┴─────────────────────────────────┤
│ [Cancel] [Save draft] [Schedule for Tue 9am] [Publish now to 2/3]  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Composer layout (Mobile 390px)

```
┌──────────────────────┐
│ [←] Draft    [Save ▼]│
├──────────────────────┤
│ [Text area]          │
│                      │
│ [Media tray]         │
│                      │
│ [AI: ✨🔄✏️]        │
├──────────────────────┤
│ Accounts: [2 sel]    │
│ Validation: ⚠️ 1     │
├──────────────────────┤
│ [Tab: Edit|Preview]  │
│ [Platform preview]   │
├──────────────────────┤
│ [Schedule] [Publish] │
└──────────────────────┘
```

#### States

- **Loading**: Skeleton placeholders for editor, preview, account list.
- **Empty**: "Start writing or paste content. Need inspiration? Try ✨ AI Generate."
- **Autosaving**: "Saved just now" / "Saving..." / "Save failed — retry" in top bar.
- **Upload progress**: Per-file progress bar in media tray with cancel button.
- **Transcoding**: "Processing video... 45%" with estimated time.
- **Validation errors**: Inline red badges per platform with expand-for-details.
- **Publishing**: Per-platform progress indicators. "Publishing to LinkedIn... ✓ Done. Publishing to Facebook... ⏳"
- **Multi-tab conflict**: Version mismatch detected → "This draft was edited in another tab. Reload to see latest."

#### Autosave with optimistic concurrency

- Autosave every 3 seconds after dirty change; show "Saved just now".
- Each save sends current `version` number. Server rejects if version doesn't match (another tab edited).
- On conflict: show warning banner with "Reload" action. Don't silently overwrite.

### Testing strategy

- Unit: validation rules by platform and MIME type, sanitization, version conflict logic.
- Integration: multipart upload endpoint, autosave API, concurrent save conflict.
- E2E: drag media, reorder, switch accounts, recover from version conflict.

### Error handling / edge cases

- Browser refresh mid-upload → preserved pending file metadata with resume prompt.
- Same media used in multiple drafts → dedupe via checksum.
- Unicode length mismatch across providers → use UTF-16 aware counters.
- Video transcode timeout → background job with poll status.
- XSS in user content → sanitize before rendering in previews.

---

## Phase 5 — Scheduling engine

### Goal

Queue scheduled posts, retries, dead-letter behavior, idempotent publish jobs, per-account rate limit guarding, and stale lock recovery.

### Exact steps with commands

```bash
npm install -w apps/api node-cron p-retry nanoid
mkdir -p apps/api/src/jobs apps/api/src/workers apps/api/src/modules/schedule
```

### Scheduling architecture

- SQLite-backed queue first (simple and portable).
- Poller every 15 seconds in dev, 5 seconds in prod.
- States:
  - `queued`
  - `locked`
  - `running`
  - `succeeded`
  - `failed_retryable`
  - `failed_terminal`
  - `dead_letter`
- **Stale lock recovery**: On startup and every poll cycle, check for jobs where `locked_at < NOW() - JOB_LOCK_TIMEOUT_MS`. Reset to `queued` if `attempts < maxAttempts`, else move to `dead_letter`.
- **Idempotency**: `dedupeKey` prevents duplicate publish jobs. Before creating a new job, check if one exists with the same key.
- **Graceful shutdown**: On SIGTERM, stop accepting new jobs, wait for in-flight jobs to complete (up to 30s), then exit.

### Testing strategy

- Unit: next-run calculation, retry policy, dedupe logic, stale lock detection.
- Integration: lock acquisition, crash recovery simulation, at-least-once execution.
- E2E: schedule post 2 minutes ahead in mock mode and verify execution.

### Error handling / edge cases

- Server restarts mid-job → reclaim stale locks after timeout.
- Duplicate publish due to retry after ambiguous timeout → dedupe key + provider result reconciliation.
- DST/timezone changes → store UTC plus source timezone string; use `dayjs` with timezone plugin.
- All jobs for a draft fail → mark draft as `failed`, send notification.

---

## Phase 6 — Instagram, YouTube Shorts, TikTok adapters

### Goal

Expand to short-form/video-first platforms with stricter media and auth requirements. Add Instagram Reels and carousel support.

### Exact steps with commands

```bash
mkdir -p packages/adapters/src/instagram packages/adapters/src/youtube packages/adapters/src/tiktok
npm install -w apps/api googleapis
```

### API connection details

#### Instagram

- Portal: `https://developers.facebook.com/`
- Docs: `https://developers.facebook.com/docs/instagram-api/guides/content-publishing/`
- Supported for professional accounts only (Business/Creator)
- Account must be connected to a Facebook Page
- Required permissions (Instagram Login path):
  - `instagram_business_basic`
  - `instagram_business_content_publish`
- Required permissions (Facebook Login path):
  - `instagram_basic`
  - `instagram_content_publish`
  - `pages_read_engagement`
- **Supported content types**:
  - **Single image**: `media_type=IMAGE`, JPEG format
  - **Single video**: `media_type=VIDEO`
  - **Reels**: `media_type=REELS` — vertical 9:16, up to 90 seconds (NEW)
  - **Carousel**: `media_type=CAROUSEL` — 2-10 images/videos (NEW)
  - **NOT supported via this plan**: Stories, branded content tags, shopping tags
- Endpoints:
  - `POST /<IG_ID>/media` (create container)
  - `POST /<IG_ID>/media_publish` (publish container)
  - `GET /<IG_CONTAINER_ID>?fields=status_code` (poll container status)
  - `GET /<IG_ID>/content_publishing_limit`
- Limits:
  - **100 API-published posts / 24-hour rolling window**
- **Container status polling**: Instagram publishing is async. After creating a container, poll `status_code` until `FINISHED` before calling `media_publish`. Implement with exponential backoff, timeout at 5 minutes.

#### YouTube / Shorts

- Portal: `https://console.cloud.google.com/`
- Docs:
  - `https://developers.google.com/youtube/v3/getting-started`
  - `https://developers.google.com/youtube/v3/guides/uploading_a_video`
- OAuth scope:
  - `https://www.googleapis.com/auth/youtube.upload`
- Upload endpoint:
  - `POST https://www.googleapis.com/upload/youtube/v3/videos`
- Use resumable uploads for large files
- Default quota:
  - **10,000 units/day/project**
  - `videos.insert` costs ~1600 units
- **YouTube Shorts detection criteria** (SPECIFIC):
  - Same upload API as regular videos — no separate endpoint
  - Classified as Short when ALL of:
    1. **Vertical aspect ratio**: 9:16 (1080x1920 recommended)
    2. **Duration**: ≤60 seconds
    3. **`#Shorts`** included in title or description
  - No API flag to force Shorts classification
- No sandbox:
  - use `privacyStatus=private` for tests

#### TikTok

- Portal: `https://developers.tiktok.com/`
- Product: **Content Posting API**
- **Media upload methods**:
  - **`FILE_UPLOAD` (chunked)**: Upload video in chunks directly to TikTok. **Recommended for local-first development** — no public URL needed.
  - **`PULL_FROM_URL`**: TikTok fetches media from your publicly accessible HTTPS URL. Requires verified domain in Developer Portal. **Only for production with CDN.**
- Required scopes:
  - `video.publish` for direct posting
  - `video.upload` for draft-in-app
- Endpoints:
  - `POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/`
  - `POST https://open.tiktokapis.com/v2/post/publish/video/init/`
- Important limits:
  - **6 requests/minute per user access token** on direct post init
- UX audit requirements:
  - Must allow user to preview content before posting
  - Must show correct account being posted to
  - Must allow editing of title, hashtags, privacy settings
  - Must require user consent before upload
- Sandbox:
  - up to **5 sandboxes/app**, **10 target users** each
  - sandbox does **not** provide public video posting
  - **Unaudited apps publish only in private viewing mode**

### Testing strategy

- Unit: platform-specific constraint validators, container status polling logic.
- Integration: mock Graph/Google/TikTok endpoints with success + quota failures + container async flows.
- E2E: publish short video to mock Instagram/YouTube/TikTok, publish carousel to mock Instagram.

---

## Phase 7 — AI text content

(Unchanged from v1 — the AI text section was already well-specified. All corrections from earlier phases apply to the adapter/logging/security infrastructure it builds on.)

### Goal

Add AI-assisted caption generation, tone rewriting, hashtag suggestions, and platform-aware copy variants via GitHub Copilot SDK.

### Exact steps with commands

```bash
npm install -w packages/ai @github/copilot-sdk
mkdir -p packages/ai/src/copilot packages/ai/src/prompts packages/ai/src/safety
```

### Service boundaries

- `generateDraftVariants`
- `rewriteForPlatform`
- `expandCampaignIdeas`
- `generateHashtags`
- `summarizePreview`
- `safetyCheckCopy`

### UI/UX considerations

- AI drawer beside composer:
  - prompt input
  - tone chips (Professional, Casual, Humorous, Urgent, Inspirational)
  - CTA chips (Learn More, Shop Now, Sign Up, Watch)
  - "Generate 3 variants"
- Never auto-replace copy; insert as suggestions user can accept/reject.
- Add "why this suggestion" explanation tooltip.
- Spinner with cancel button; show estimated wait time.
- Rate limited: show "X/10 AI requests remaining this minute."

---

## Phase 8 — AI content planner & campaigns

(Unchanged from v1 — well-specified.)

### Goal

Turn drafts into campaigns, calendars, themes, pillars, and approval workflows.

---

## Phase 9 — Analytics dashboard

(Unchanged from v1 — well-specified.)

### Goal

Track publish outcomes, engagement snapshots, and campaign performance summaries.

---

## Phase 10 — Electron desktop

(Unchanged from v1.)

### Goal

Wrap the web app/API for desktop workflows, secure local storage, OS notifications, and offline draft editing.

---

## Phase 11 — AI image generation (Azure OpenAI / DALL·E 3)

(Unchanged from v1 — well-specified.)

### Goal

Generate campaign images from prompts with safety filters and cost controls.

---

## Phase 12 — AI video generation (future / gated)

(Unchanged from v1.)

### Goal

Design extension points for future AI video generation without blocking current roadmap.

---

## Phase 13 — Polish & hardening

### Goal

Secure, stabilize, document, monitor, and prepare for production.

### Hardening checklist (IMPROVED)

- [x] CSP + secure headers (defined in Section I)
- [x] CSRF protection on mutating browser routes
- [x] Request validation with Zod everywhere
- [x] Audit logs for auth/connect/publish/disconnect
- [x] Structured logs with correlation IDs (moved to Phase 1)
- [x] Rate limiting on all API routes (moved to Phase 1)
- [ ] SQLite backup automation (cron job)
- [ ] Media garbage collection (orphan cleanup job)
- [ ] Connected account health polling (6-hour cycle)
- [ ] Migration rollback strategy (snapshot before migrate)
- [ ] Playwright smoke on every PR
- [ ] Secrets scanning in CI (`gitleaks` or GitHub Advanced Security)
- [ ] OpenAPI spec validation in CI
- [ ] Performance profiling: identify slow queries, add missing indexes
- [ ] Data export endpoints (drafts, campaigns, analytics as CSV/JSON)
- [ ] Error boundary coverage for all feature areas
- [ ] Accessibility audit with axe-core
- [ ] Dark mode testing across all screens

### Testing strategy

- Unit coverage gate: 80% on shared/business logic
- Integration suite on every PR
- E2E smoke on every PR; full regression nightly
- Provider contract tests for each adapter
- Accessibility: axe-core integration in Playwright tests

---

## L. UI/UX Wireframe Descriptions (IMPROVED)

### Global UX principles

- Desktop-first at 1280px, tablet-usable at 768px, and composer-operable at 390px mobile width.
- **Component library**: shadcn/ui (Radix primitives + Tailwind). Provides accessible Dialog, DropdownMenu, Popover, Tabs, Tooltip, Toast, Select, and more.
- **Dark mode**: System preference detection + manual toggle. All screens must be tested in both modes.
- WCAG 2.2 AA contrast, keyboard navigation for primary flows, visible focus rings, labeled controls, and 44x44 minimum touch targets.
- Every major screen needs explicit loading, empty, success, warning, and failure states.
- Mock/sandbox badges should always be visible in local development.
- **Toast notifications**: via sonner — success (green), error (red), warning (yellow), info (blue). Auto-dismiss after 5s for success, sticky for errors.
- **Transitions**: subtle CSS transitions (150-200ms) for state changes. Respect `prefers-reduced-motion`.

### 1. Account Manager

- Dashboard-style layout with platform sections.
- **Unconnected**: greyed card, explanation of integration benefits, **Connect account** CTA.
- **Connected**: avatar, account name, handle, account-type badge, health status indicator, token expiry, last sync time.
- Quick actions: Reconnect, Refresh token, Set default, Disconnect (with confirmation dialog).
- Bulk filters: All, Healthy, Warning, Error, Needs Reauth.
- **Empty state**: "Connect your first social account to start posting. We support LinkedIn, Facebook Pages, Instagram, YouTube, and TikTok."

### 2. Post Composer

(See detailed wireframes in Phase 4 above.)

### 3. Calendar / Campaign Planner

- Monthly and weekly calendar views + Kanban/status board.
- Scheduled posts as compact cards color-coded by platform.
- Drag-and-drop rescheduling with snapping to time slots.
- Side panel: campaign brief, AI strategy notes, approval controls.
- **Empty state**: "No scheduled posts yet. Create a draft and schedule it, or use AI to plan a week of content."

### 4. Analytics Dashboard

- Header: date-range picker + workspace/platform/account/campaign filters.
- Top row: KPI cards (total reach, engagement, success rate, publish latency, top campaign).
- Main: performance-over-time chart, platform comparison donut.
- Bottom: top-performing posts, sortable campaign table.
- **Empty state**: "Publish 5 posts to unlock trends. Connect accounts and start creating!"
- **Partial data**: When provider insights are unavailable, show internal metrics with "Provider insights require additional permissions" banner.

---

## M. CI/CD Plan

### Minimum CI commands

```bash
npm ci
npm run lint
npm run test
npm run build
npm run db:generate
npm run db:migrate  # against test database
```

### Recommended GitHub Actions jobs

1. `lint-test-build` — installs, lints, tests, builds all workspaces
2. `playwright-smoke` — runs E2E smoke tests
3. `migration-smoke` — applies migrations to fresh SQLite, runs integrity check
4. `openapi-validate` — validates generated OpenAPI spec
5. `accessibility-audit` — runs axe-core in Playwright
6. `secrets-scan` — gitleaks or GitHub Advanced Security
7. `desktop-package` (later) — packages Electron app

---

## N. Definition of Done / Milestones

1. Phase 1 — Foundation ✓ when: monorepo boots, logging works, rate limiting active, seed data loads, tests pass
2. Phase 2 — Adapter framework ✓ when: mock adapter connects, tokens encrypted, health checks run
3. Phase 3 + Phase 4 in parallel after contracts stabilize
4. Phase 5 — Scheduler ✓ when: post scheduled and published via mock in tests
5. Phase 6 — All 5 platforms ✓ when: mock publish to all 5 works, Reels + carousel for IG
6. Phase 7 — AI text ✓ when: generate/rewrite flow works in mock + live Copilot SDK
7. Phase 8 — Campaigns ✓ when: AI plan generation + manual campaign CRUD works
8. Phase 9 — Analytics ✓ when: dashboard renders with seeded data
9. Phase 13 — Hardening before public rollout
10. Phase 10/11/12 as expansion tracks

### MVP done

- Workspace bootstrapped with team member invites
- LinkedIn + Facebook Pages working (post, image, video)
- Multi-account support with health monitoring
- Composer with media, previews, autosave, version conflict detection
- Scheduling + retries + dead letter
- Mock mode + basic analytics
- Structured logging + rate limiting + CSRF + CSP

### V1 done

- Instagram (image + video + Reels + carousel) + YouTube + TikTok supported
- AI copy assist live
- Campaign planner live
- Hardening complete
- Data export available
- Dark mode
- Accessibility audit passed

### VNext done

- Desktop app (Electron)
- AI images
- Experimental AI video