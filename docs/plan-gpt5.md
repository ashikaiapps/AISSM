# SocialKeys.ai — Detailed Implementation Plan

## 0) Executive summary

Build SocialKeys.ai as a TypeScript npm-workspaces monorepo with:

- **Frontend**: React 18, Vite, TailwindCSS, React Router, TanStack Query, Zustand
- **Backend**: Express 5, REST API, OAuth callbacks, adapter orchestration, scheduling workers
- **Database**: SQLite + `better-sqlite3` + Drizzle ORM
- **AI**: `@github/copilot-sdk` for text generation/planning, Azure OpenAI image generation later
- **Architecture**: shared domain package + adapter package + background job worker + strong mock/sandbox mode
- **Delivery order**: ship real value by Phase 4, automate at Phase 5, expand channels at Phase 6, add AI on top after stable posting exists

---

## 1) Local dev quickstart (clone → running in ~5 minutes)

> Assumes Node.js 20 LTS and npm 10+.

### Commands

```powershell
git clone <repo-url> SocialKeys.ai
cd SocialKeys.ai

# workspace bootstrap
npm init -y

# after Phase 1 scaffolding exists
copy .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

### Expected dev URLs

- Web app: `http://localhost:5173`
- API: `http://localhost:3001`
- API health: `http://localhost:3001/health`
- OAuth callback base: `http://localhost:3001/auth/callback/:platform`

### Minimum env vars for local mock mode

```dotenv
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
PORT=3001
DATABASE_URL=.\data\socialkeys.dev.sqlite
SESSION_SECRET=replace-me
ENCRYPTION_KEY=replace-with-32-byte-key
CORS_ORIGIN=http://localhost:5173
PUBLISH_MODE=mock
ENABLE_AI_TEXT=false
ENABLE_AI_IMAGES=false
ENABLE_VIDEO_GEN=false
LOG_LEVEL=debug
```

### Mock/sandbox behavior

- `PUBLISH_MODE=mock` → adapters never hit real APIs; responses stored as simulated successes/failures.
- `SOCIAL_SANDBOX_ONLY=true` → only use platform test accounts / private posting / draft posting.
- `ENABLE_SCHEDULER=true` with `WORKER_INLINE=true` → run jobs in the API process for simple local dev.
- `USE_MSW=true` in web tests → mock REST API and OAuth callback states.

---

## 2) Recommended monorepo structure

```text
SocialKeys.ai\
  apps\
    web\
      src\
        app\
        components\
        features\
        hooks\
        lib\
        pages\
        routes\
        styles\
      public\
      index.html
      vite.config.ts
    api\
      src\
        app.ts
        server.ts
        config\
        db\
        middleware\
        modules\
          auth\
          accounts\
          adapters\
          composer\
          media\
          posts\
          schedule\
          campaigns\
          analytics\
          ai\
        jobs\
        workers\
        clients\
        utils\
      drizzle.config.ts
  packages\
    database\
      src\
        schema\
        migrations\
        client.ts
    shared\
      src\
        types\
        constants\
        validators\
    adapters\
      src\
        base\
        linkedin\
        facebook\
        instagram\
        youtube\
        tiktok\
        registry.ts
    ai\
      src\
        copilot\
        prompts\
        planning\
        safety\
    ui\
      src\
        components\
        tokens\
    config\
      eslint\
      typescript\
      tailwind\
  scripts\
  data\
  tests\
    e2e\
    fixtures\
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

## 3) Foundation conventions

### Package/runtime choices

- Node.js: **20 LTS**
- TypeScript: **5.6+**
- React: **18.3+**
- Vite: **5.x**
- Express: **5.x**
- Drizzle ORM: **0.36+**
- better-sqlite3: **9.x / 10.x**
- TailwindCSS: **3.4+**
- Vitest + RTL + Playwright

### Core engineering rules

- TypeScript strict mode on everywhere.
- Never store OAuth tokens unencrypted.
- All provider calls go through adapter interfaces.
- Every publish action writes an immutable attempt record.
- Media validation happens **before** queueing.
- Every async workflow must be idempotent.

---

# PHASE-BY-PHASE IMPLEMENTATION

---

## Phase 1 — Foundation

### Goal

Create the monorepo, shared config, API/web apps, SQLite/Drizzle wiring, auth/session foundation, and CI-grade scripts.

### Exact steps with commands

#### 1. Initialize the workspace

```powershell
mkdir apps, packages, scripts, data
npm init -y
npm pkg set private=true
npm pkg set "workspaces[0]=apps/*"
npm pkg set "workspaces[1]=packages/*"
```

#### 2. Create root tooling

```powershell
npm install -D typescript tsx vite vitest @vitest/coverage-v8 playwright concurrently cross-env rimraf \
eslint @eslint/js typescript-eslint prettier prettier-plugin-tailwindcss \
tailwindcss postcss autoprefixer
```

#### 3. Create shared packages

```powershell
mkdir packages\config, packages\shared, packages\database, packages\ui, packages\adapters, packages\ai
mkdir packages\database\src\schema, packages\shared\src, packages\adapters\src, packages\ai\src
```

#### 4. Scaffold API app

```powershell
mkdir apps\api, apps\api\src, apps\api\src\modules, apps\api\src\middleware, apps\api\src\config, apps\api\src\db
npm install -w apps/api express cors helmet morgan zod cookie-parser express-session better-sqlite3 drizzle-orm drizzle-kit
npm install -D -w apps/api @types/express @types/cors @types/morgan @types/cookie-parser @types/express-session supertest @types/supertest
```

#### 5. Scaffold web app

```powershell
npm create vite@latest apps/web -- --template react-ts
npm install -w apps/web react-router-dom @tanstack/react-query zustand clsx tailwind-merge zod react-hook-form
npm install -D -w apps/web tailwindcss postcss autoprefixer @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
npx tailwindcss init -p
```

#### 6. Add root scripts

```powershell
npm pkg set scripts.dev="concurrently \"npm:dev:web\" \"npm:dev:api\""
npm pkg set scripts.dev:web="npm run dev -w apps/web"
npm pkg set scripts.dev:api="npm run dev -w apps/api"
npm pkg set scripts.build="npm run build --workspaces"
npm pkg set scripts.test="npm run test --workspaces"
npm pkg set scripts.lint="eslint ."
npm pkg set scripts.db:generate="drizzle-kit generate --config apps/api/drizzle.config.ts"
npm pkg set scripts.db:migrate="tsx apps/api/src/db/migrate.ts"
npm pkg set scripts.db:studio="drizzle-kit studio --config apps/api/drizzle.config.ts"
```

### Files to create first

- `package.json`
- `tsconfig.base.json`
- `.editorconfig`
- `.gitignore`
- `.env.example`
- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/db/index.ts`
- `apps/api/src/db/migrate.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/app/router.tsx`
- `packages/database/src/client.ts`
- `packages/database/src/schema/core.ts`
- `packages/shared/src/types.ts`

### Local development setup

- Use SQLite file: `.\data\socialkeys.dev.sqlite`
- Use cookie session in dev, secure cookie only in prod
- Add `/health`, `/ready`, `/api/v1/meta`
- Start with local mock auth providers before real OAuth

### Platform permissions & app registration

- None in this phase.
- Only create placeholder OAuth callback routes and env variables.
- Do not request any third-party scopes until Phase 2/3 to keep early setup deterministic.

### Database schema (actual SQL)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Database schema (Drizzle)

```ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
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
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

### UI/UX design considerations

- Shell layout with left nav, top workspace switcher, persistent save/status bar.
- Empty state on dashboard: “Connect your first account”.
- App must work at 1280px desktop first, then 768px tablet; composer usable on 390px mobile.
- Keyboard navigation for primary actions.
- Color contrast AA minimum.

### Testing strategy

- Unit: schema validators, env parsing, utility functions.
- Integration: `/health`, session middleware, DB boot.
- E2E: app loads, login mock, create workspace.

### Error handling / edge cases

- Missing env → fail fast on boot.
- SQLite file locked → show recovery instructions, retry backoff.
- Schema drift → migration version check on boot.
- Bad session cookie → clear cookie and redirect to login.

---

## Phase 2 — Adapter framework + multi-account

### Goal

Define adapter contracts, OAuth token storage/refresh, account connection flow, and multi-account selection per platform.

### Exact steps with commands

```powershell
npm install -w apps/api openid-client jose
mkdir packages\adapters\src\base, packages\adapters\src\registry
mkdir apps\api\src\modules\auth apps\api\src\modules\accounts apps\api\src\modules\adapters
```

### Files to create

- `packages/adapters/src/base/types.ts`
- `packages/adapters/src/base/SocialAdapter.ts`
- `packages/adapters/src/registry.ts`
- `apps/api/src/modules/auth/oauth.service.ts`
- `apps/api/src/modules/accounts/accounts.controller.ts`
- `apps/web/src/features/accounts/*`

### Recommended adapter contract

```ts
export interface SocialAdapter {
  platform: "linkedin" | "facebook" | "instagram" | "youtube" | "tiktok";
  connectUrl(input: ConnectUrlInput): Promise<string>;
  exchangeCode(input: ExchangeCodeInput): Promise<ConnectedAccount>;
  refreshToken(account: StoredAccount): Promise<RefreshedToken>;
  validateMedia(input: ValidateMediaInput): Promise<MediaValidationResult>;
  publish(input: PublishInput): Promise<PublishResult>;
  getAccountProfile(input: AccessTokenInput): Promise<AccountProfile>;
  getRateLimit?(input: AccessTokenInput): Promise<RateLimitStatus | null>;
}
```

### Database schema additions (SQL)

```sql
CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  external_account_name TEXT NOT NULL,
  handle TEXT,
  account_type TEXT,
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, platform, external_account_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE oauth_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  social_account_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scopes TEXT NOT NULL,
  expires_at TEXT,
  refresh_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
);
```

### Drizzle additions

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
  isActive: text("is_active", { mode: "boolean" }).notNull().default(true),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
});
```

### Local development setup

- Add a fake adapter implementing OAuth callback without third-party APIs.
- Add `GET /api/v1/auth/:platform/start`
- Add `GET /api/v1/auth/:platform/callback`
- Add `GET /api/v1/accounts`
- Add `POST /api/v1/accounts/:id/disconnect`

### API connection details

- Standard OAuth 2.0 authorization code flow for all supported platforms.
- Persist `state` + PKCE verifier in a short-lived server table or signed encrypted cookie.
- Refresh tokens in background when expiry < 15 minutes.
- Encrypt tokens with AES-256-GCM using `ENCRYPTION_KEY`.

### UI/UX considerations

- Account Manager page with:
  - platform cards
  - connected account rows
  - account-type badge (Page/Profile/Channel/Business)
  - “Reconnect”, “Set default”, “Disconnect”
- Account picker in composer must support:
  - single-select per platform at first
  - multi-select across platforms
  - multiple Instagram accounts clearly labeled

### Testing strategy

- Unit: token encryption, OAuth state validation, adapter registry.
- Integration: connect callback success/failure, duplicate account prevention.
- E2E: connect mock LinkedIn + second Instagram account.

### Error handling / edge cases

- User connects same account twice → upsert, do not duplicate.
- Token expires and refresh fails → mark `reauth_required`.
- Workspace member disconnects shared account → enforce role check.
- OAuth state mismatch → hard fail, audit log, no partial account creation.

---

## Phase 3 — LinkedIn & Facebook adapters

### Goal

Ship first production channels: LinkedIn text/image/video posts and Facebook Page text/image/video/link posts.

### Exact steps with commands

```powershell
mkdir packages\adapters\src\linkedin, packages\adapters\src\facebook
npm install -w apps/api undici form-data
```

### Files to create

- `packages/adapters/src/linkedin/LinkedInAdapter.ts`
- `packages/adapters/src/facebook/FacebookAdapter.ts`
- `apps/api/src/modules/posts/post-publish.service.ts`
- `apps/api/src/modules/media/media-upload.service.ts`
- `apps/web/src/features/composer/platform-preview/*`

### API connection details

#### LinkedIn

- Developer portal: `https://developer.linkedin.com/`
- Docs: `https://learn.microsoft.com/en-us/linkedin/`
- OAuth products: **Sign In with LinkedIn**, **Share on LinkedIn**
- Required scopes:
  - `w_member_social`
  - `w_organization_social` for company page posting
  - `r_organization_social` if reading org social state
- Post endpoint:
  - `POST https://api.linkedin.com/rest/posts`
- Required headers:
  - `Authorization: Bearer <token>`
  - `X-Restli-Protocol-Version: 2.0.0`
  - `Linkedin-Version: YYYYMM`
- Media upload:
  - use LinkedIn Images API / Videos API first, then reference returned URNs in post payload
- Sandbox/testing:
  - no universal sandbox; use localhost redirect URIs and real test profiles/pages
- Rate limits:
  - app-specific throttling; expect `429`; implement exponential backoff and visible retry state

#### Facebook Pages API

- Developer portal: `https://developers.facebook.com/`
- Page posting docs: `https://developers.facebook.com/docs/pages-api/posts/`
- Required permissions:
  - `pages_manage_posts`
  - `pages_read_engagement`
  - `pages_manage_engagement`
  - `pages_read_user_engagement`
  - `publish_video` for video
- User must have Page tasks:
  - `CREATE_CONTENT`, `MANAGE`, `MODERATE`
- Endpoints:
  - `POST https://graph.facebook.com/v25.0/{page_id}/feed`
  - `POST https://graph.facebook.com/v25.0/{page_id}/photos`
  - `POST https://graph.facebook.com/v25.0/{page_id}/videos`
- Scheduling via API:
  - `published=false`
  - `scheduled_publish_time`
  - allowed window: **10 minutes to 30 days**
- Test mode:
  - app admins/developers/testers only until app review

### Platform permissions & registration

#### LinkedIn registration steps

1. Create app in LinkedIn Developer portal.
2. Add logo, legal name, privacy policy URL, app use case.
3. Configure redirect URI: `http://localhost:3001/auth/callback/linkedin`
4. Add **Share on LinkedIn** product.
5. If posting to orgs, request organization scopes and complete approval questionnaire.
6. Link app to a company page you manage for org tests.

#### Meta/Facebook registration steps

1. Create Meta Developer account.
2. Create **Business** type app.
3. Add Facebook Login for Business + Pages API.
4. Set OAuth redirect URI: `http://localhost:3001/auth/callback/facebook`
5. Add test users / testers.
6. Request advanced access for page permissions.
7. Submit screencast and written use case for App Review.

### Database schema additions

```sql
CREATE TABLE post_drafts (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  title TEXT,
  body_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content_type TEXT NOT NULL DEFAULT 'text',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  checksum_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE TABLE draft_targets (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL,
  social_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE CASCADE,
  FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE CASCADE
);
```

### UI/UX considerations

- Composer right rail: per-platform live preview.
- LinkedIn preview: professional text card, article/image/video chip.
- Facebook preview: page header, message body, media block.
- Warn when a selected platform cannot support a field.
- Inline permission status badge:
  - Connected
  - Limited access
  - Needs review
  - Re-auth required

### Testing strategy

- Unit: LinkedIn/Facebook payload mapping.
- Integration: mock provider API with `nock` or MSW-node.
- E2E: create draft, select accounts, publish in mock mode.

### Error handling / edge cases

- LinkedIn org post without org scope → disable org targets.
- Facebook Page task missing → show reconnect with admin requirement.
- Media asset accepted by app but rejected by provider → store provider reason and actionable fix.
- Partial multi-platform publish → per-target status, never fail entire batch silently.

---

## Phase 4 — Post composer & media handling

### Goal

Build the main authoring experience: rich composer, account selector, media validation/transcoding pipeline, previews, and draft autosave.

### Exact steps with commands

```powershell
npm install -w apps/web @dnd-kit/core @dnd-kit/sortable dayjs
npm install -w apps/api sharp ffmpeg-static fluent-ffmpeg multer
mkdir apps\web\src\features\composer apps\api\src\modules\composer apps\api\src\modules\media
```

### Files to create

- `apps/web/src/features/composer/ComposerPage.tsx`
- `apps/web/src/features/composer/AccountSelector.tsx`
- `apps/web/src/features/composer/PlatformWarnings.tsx`
- `apps/web/src/features/composer/MediaDropzone.tsx`
- `apps/api/src/modules/media/media-validation.service.ts`
- `apps/api/src/modules/media/media-transcode.service.ts`

### Local development setup

- Use local disk storage first: `.\data\uploads\`
- Add `MAX_UPLOAD_MB` and per-platform validation profiles
- Install FFmpeg via package or system; verify on startup

### API connection details

- No new provider auth here; focus on provider media constraints.
- LinkedIn: upload assets before posting.
- Facebook: can use URL uploads or file uploads depending format and endpoint.
- For future Instagram/TikTok/YouTube, validate against strictest common denominator in multi-select mode.

### Platform permissions & app registration

- No new registrations in this phase.
- Reuse account connections established in Phases 2–3.
- Add a “capabilities matrix” endpoint so the UI can disable unsupported media combinations without new OAuth work.

### Database schema additions

```sql
CREATE TABLE draft_media (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  purpose TEXT NOT NULL DEFAULT 'primary',
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE CASCADE,
  FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE CASCADE
);

CREATE TABLE draft_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE CASCADE
);
```

### UI/UX design considerations

- Autosave every 3 seconds after dirty change; show “Saved just now”.
- Account selector grouped by platform with avatars and account badges.
- Media tray with drag reorder.
- Character counter per platform:
  - show conservative warning when content exceeds one platform’s rules
- Loading states:
  - upload progress
  - transcoding progress
  - preview generating
- Error states:
  - unsupported aspect ratio
  - oversized file
  - missing alt text prompt

### Wireframe description — Post Composer

- **Header**: draft title, save state, “Publish now”, “Schedule”
- **Left column**: text area, AI assist, hashtag suggestions, CTA links, media tray
- **Top selector row**: workspace, target accounts, campaign tag
- **Right column**: stacked previews per selected platform
- **Footer**: validation summary, best-time suggestion placeholder, publish CTA

### Testing strategy

- Unit: validation rules by platform and MIME type.
- Integration: multipart upload endpoint, autosave API.
- E2E: drag media, reorder, switch accounts, recover refresh.

### Error handling / edge cases

- Browser refresh mid-upload → resumable upload or preserved pending file metadata.
- Same media used in multiple drafts → dedupe via checksum.
- Unicode length mismatch across providers → use UTF-16 aware counters.
- Video transcode timeout → background job with poll status.

---

## Phase 5 — Scheduling engine

### Goal

Queue scheduled posts, retries, dead-letter behavior, idempotent publish jobs, and per-account rate limit guarding.

### Exact steps with commands

```powershell
npm install -w apps/api node-cron p-retry nanoid
mkdir apps\api\src\jobs apps\api\src\workers apps\api\src\modules\schedule
```

### Files to create

- `apps/api/src/workers/scheduler.ts`
- `apps/api/src/jobs/publish-draft.job.ts`
- `apps/api/src/modules/schedule/schedule.service.ts`
- `apps/web/src/features/schedule/ScheduleModal.tsx`

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

### Database schema additions

```sql
CREATE TABLE scheduled_posts (
  id TEXT PRIMARY KEY NOT NULL,
  draft_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  scheduled_for TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE publish_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  scheduled_post_id TEXT,
  draft_target_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  run_after TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error_code TEXT,
  last_error_message TEXT,
  locked_by TEXT,
  locked_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scheduled_post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_target_id) REFERENCES draft_targets(id) ON DELETE CASCADE
);
```

### Local development setup

- `.env`:
  - `ENABLE_SCHEDULER=true`
  - `WORKER_POLL_MS=15000`
  - `WORKER_INLINE=true`
- Add dev-only route: `POST /api/v1/dev/run-queue-now`

### API connection details

- Facebook native scheduling exists, but keep **SocialKeys scheduler as system of record** for cross-platform consistency.
- Respect provider-specific limits:
  - Facebook scheduled posts: 10 minutes–30 days
  - Instagram: 100 API-published posts per 24h
  - TikTok: 6 direct-post init requests/min per user token
  - YouTube: quota budgeting before job dispatch

### Platform permissions & app registration

- No new app registrations in this phase.
- Reuse existing publish scopes.
- Add per-platform preflight checks so a schedule cannot be created when the required publish scope is missing or already expired.

### UI/UX considerations

- Schedule modal with timezone selector and “best time” slot placeholder.
- Calendar view + list view.
- Job details drawer: attempts, last response, next retry.
- Show “Will publish as private/draft in sandbox mode”.

### Testing strategy

- Unit: next-run calculation, retry policy, dedupe logic.
- Integration: lock acquisition, crash recovery, at-least-once execution.
- E2E: schedule post 2 minutes ahead in mock mode and verify execution.

### Error handling / edge cases

- Server restarts mid-job → reclaim stale locks after timeout.
- Duplicate publish due to retry after ambiguous timeout → dedupe key + provider result reconciliation.
- DST/timezone changes → store UTC plus source timezone string.

---

## Phase 6 — Instagram, YouTube Shorts, TikTok adapters

### Goal

Expand to short-form/video-first platforms with stricter media and auth requirements.

### Exact steps with commands

```powershell
mkdir packages\adapters\src\instagram, packages\adapters\src\youtube, packages\adapters\src\tiktok
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
- Endpoints:
  - `POST /<IG_ID>/media`
  - `POST /<IG_ID>/media_publish`
  - `GET /<IG_CONTAINER_ID>?fields=status_code`
  - `GET /<IG_ID>/content_publishing_limit`
- Host URLs:
  - `graph.instagram.com`
  - `graph.facebook.com`
  - `rupload.facebook.com` for resumable video uploads
- Limits:
  - **100 API-published posts / 24-hour rolling window**
- Constraints:
  - JPEG only for images
  - no Stories via this plan
  - no branded/shopping tags initially

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
  - official quota calculator currently lists `videos.insert = 100`
- No sandbox:
  - use `privacyStatus=private` for tests
- Shorts:
  - same upload API; Shorts classification depends on video properties, not a separate endpoint

#### TikTok

- Portal: `https://developers.tiktok.com/`
- Product: **Content Posting API**
- Docs:
  - `https://developers.tiktok.com/products/content-posting-api/`
  - `https://developers.tiktok.com/doc/content-posting-api-get-started/`
- OAuth/login:
  - Login Kit + authorization code flow
- Required scopes:
  - `video.publish` for direct posting
  - `video.upload` later if drafts-in-app are desired
- Endpoints:
  - `POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/`
  - `POST https://open.tiktokapis.com/v2/post/publish/video/init/`
- Important official limit:
  - **each user access token is limited to 6 requests/minute** on direct post init
- Sandbox:
  - up to **5 sandboxes/app**
  - up to **10 target users**
  - sandbox does **not** provide public video posting
- Audit:
  - unaudited clients publish only in private viewing mode

### Platform registration steps

#### Instagram registration

1. Create/update Meta Business app.
2. Add Instagram API product.
3. Convert IG account to Professional.
4. Link IG account to Facebook Page.
5. Add tester/admin accounts.
6. Request advanced access and submit app review.
7. Advise users to complete Page Publishing Authorization (PPA) proactively.

#### YouTube registration

1. Create Google Cloud project.
2. Enable YouTube Data API v3.
3. Configure OAuth consent screen.
4. Add redirect URI: `http://localhost:3001/auth/callback/youtube`
5. Request app verification for sensitive scopes when moving beyond internal/test users.

#### TikTok registration

1. Create TikTok developer account.
2. Create org-owned app.
3. Add Login Kit + Content Posting API.
4. Verify domain/URL prefix for media pull.
5. Enable Direct Post configuration.
6. Create sandbox and add target users.
7. Request `video.publish` scope and submit audit.

### Database schema additions

```sql
CREATE TABLE provider_publish_records (
  id TEXT PRIMARY KEY NOT NULL,
  publish_job_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  provider_post_id TEXT,
  provider_container_id TEXT,
  provider_media_id TEXT,
  provider_response_json TEXT NOT NULL DEFAULT '{}',
  published_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (publish_job_id) REFERENCES publish_jobs(id) ON DELETE CASCADE
);
```

### UI/UX considerations

- Platform-specific warning chips:
  - “Instagram requires public media URL”
  - “YouTube upload will be private in test mode”
  - “TikTok unaudited apps publish privately”
- Reel/Short/TikTok preview should use vertical frame.
- Show account capability matrix before publish.

### Testing strategy

- Unit: platform-specific constraint validators.
- Integration: mock Graph/Google/TikTok endpoints with success + quota failures.
- E2E: publish short video to mock Instagram/YouTube/TikTok.

### Error handling / edge cases

- IG account connected but not professional → block with remediation text.
- Page Publishing Authorization blocks IG publish → account state `action_required`.
- YouTube quota exhausted → fail-fast before upload and suggest next reset time.
- TikTok scope approved but audit missing → show “private-only publish mode”.

---

## Phase 7 — AI text content

### Goal

Add AI-assisted caption generation, tone rewriting, hashtag suggestions, and platform-aware copy variants.

### Exact steps with commands

```powershell
npm install -w packages/ai @github/copilot-sdk
mkdir packages\ai\src\copilot packages\ai\src\prompts packages\ai\src\safety
```

### API connection details

#### GitHub Copilot SDK

- Package: `@github/copilot-sdk`
- Docs: `https://docs.github.com/en/copilot/how-tos/copilot-sdk/sdk-getting-started`
- Status: technical preview
- Prerequisites:
  - Node.js 18+
  - GitHub Copilot CLI installed and authenticated
- SDK communicates with local Copilot CLI
- Create sessions via `CopilotClient`, choose model per request
- Plan target model:
  - use **Claude Opus 4.6** when available in account policy/config
  - keep fallback to `gpt-4.1`

### Suggested service boundaries

- `generateDraftVariants`
- `rewriteForPlatform`
- `expandCampaignIdeas`
- `generateHashtags`
- `summarizePreview`
- `safetyCheckCopy`

### Database schema additions

```sql
CREATE TABLE ai_generations (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT NOT NULL,
  model_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Local development setup

- Require:
  - `copilot --version`
  - authenticated CLI session
- Fallback behavior:
  - if Copilot unavailable, disable AI buttons gracefully
- Add feature flag:
  - `ENABLE_AI_TEXT=true`

### UI/UX considerations

- AI drawer beside composer:
  - prompt input
  - tone chips
  - CTA chips
  - “Generate 3 variants”
- Never auto-replace copy; insert as suggestions.
- Add “why this suggestion” explanation.
- Add token/latency spinner and cancel button.

### Testing strategy

- Unit: prompt builders, result parsing, guardrails.
- Integration: mock Copilot session client.
- E2E: generate variants, accept one into composer.

### Error handling / edge cases

- No Copilot CLI auth → actionable setup toast.
- Model unavailable → fallback model + warning banner.
- Hallucinated claims → run pre-publish rules/safety validation.
- Long AI output exceeds platform limits → auto-trim suggestions or flag.

---

## Phase 8 — AI content planner & campaigns

### Goal

Turn drafts into campaigns, calendars, themes, pillars, and approval workflows.

### Exact steps with commands

```powershell
mkdir apps\api\src\modules\campaigns apps\web\src\features\campaigns
```

### Local development setup

- Seed 2 sample campaigns and 20 campaign items into dev DB.
- Add `npm run seed:campaigns` for realistic planner UI testing.
- Keep AI planning in stub mode unless `ENABLE_AI_TEXT=true`.

### API connection details

- Reuse Copilot SDK integration from Phase 7.
- No new social provider APIs are required to create/edit campaigns.
- Planner suggestions should remain decoupled from real publish actions until the user explicitly converts items into drafts.

### Platform permissions & app registration

- No new platform registration required.
- If planner reads posting windows/limits, read them from adapter capability metadata already stored server-side.

### Database schema additions

```sql
CREATE TABLE campaigns (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  audience TEXT,
  tone TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE campaign_items (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL,
  draft_id TEXT,
  planned_for TEXT,
  channel_mix_json TEXT NOT NULL DEFAULT '[]',
  pillar TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE SET NULL
);
```

### UI/UX design considerations

- Planner views:
  - month calendar
  - Kanban by status
  - strategy brief panel
- AI-generated plan must be editable line-by-line.
- Approval states:
  - draft
  - needs-review
  - approved
  - scheduled

### Wireframe description — Campaign Planner

- **Left rail**: campaign list, filters, pillar tags
- **Center**: calendar/board timeline
- **Right panel**: AI strategy brief, target personas, prompts, suggestions
- **Top actions**: generate month plan, duplicate campaign, export CSV

### Testing strategy

- Unit: planner slot generation.
- Integration: campaign creation + AI suggestion persistence.
- E2E: generate 2-week plan and turn items into drafts.

### Error handling / edge cases

- AI creates too many items for platform limits → quota-aware rebalance.
- Campaign date range crosses DST → use timezone-aware storage.

---

## Phase 9 — Analytics dashboard

### Goal

Track publish outcomes, engagement snapshots, and campaign performance summaries.

### Exact steps with commands

```powershell
mkdir apps\web\src\features\analytics apps\api\src\modules\analytics
npm install -w apps/web recharts
```

### Local development setup

- Seed publish records and analytics snapshots with a script like `npm run seed:analytics`.
- Build the UI against seeded internal metrics first; provider metrics can remain optional until scopes are approved.
- Add a dev toggle to simulate degraded provider data for empty/partial states.

### API connection details

- Start with internal analytics:
  - publish success rate
  - latency
  - content volume by platform
- Add provider insights only where permitted:
  - LinkedIn org/member social read scopes are restricted
  - Instagram insights require appropriate permissions and pro accounts
  - Facebook page insights access depends on advanced permissions
  - YouTube analytics is a later optional expansion

### Platform permissions & app registration

- No new write permissions.
- If you expand into provider insights, request those read scopes only after publish flows are stable.
- Keep analytics dashboard functional even when only internal metrics are available.

### Database schema additions

```sql
CREATE TABLE analytics_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  social_account_id TEXT,
  provider_publish_record_id TEXT,
  metric_date TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (social_account_id) REFERENCES social_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (provider_publish_record_id) REFERENCES provider_publish_records(id) ON DELETE SET NULL
);
```

### UI/UX considerations

- Dashboard cards:
  - published this week
  - success rate
  - avg publish latency
  - top campaign
- Filters:
  - workspace
  - platform
  - account
  - campaign
  - date range
- Empty state:
  - “Publish 5 posts to unlock trends”

### Wireframe description — Analytics Dashboard

- **Top row**: KPI cards
- **Left main**: performance-over-time chart
- **Right main**: platform share donut + failures list
- **Bottom**: campaign table with sort/filter

### Testing strategy

- Unit: aggregation helpers.
- Integration: analytics refresh job.
- E2E: load dashboard with seeded records.

### Error handling / edge cases

- Provider insight scope missing → show partial analytics badge.
- Historic data gaps → dotted chart gaps, not misleading zeroes.

---

## Phase 10 — Electron desktop

### Goal

Wrap the web app/API for desktop workflows, secure local storage, OS notifications, and offline draft editing.

### Exact steps with commands

```powershell
mkdir apps\desktop
npm init -w apps/desktop -y
npm install -w apps/desktop electron electron-builder
npm install -D -w apps/desktop @types/electron
```

### Local development setup

- Run desktop against local API first.
- Default to embedded API process only after web version is stable.
- Use OS keychain for token/key storage if desktop becomes primary client.

### Platform permissions & app registration

- No new social platform registration.
- If deep-link OAuth is added later, register custom protocol handlers per OS and update provider redirect URIs accordingly.

### Files to create

- `apps/desktop/main.ts`
- `apps/desktop/preload.ts`
- `apps/desktop/renderer.ts`

### UI/UX considerations

- Native tray with “Queued posts”, “Next publish”.
- OS notifications for publish success/failure.
- Offline draft editing with sync indicator.

### Testing strategy

- Unit: preload bridge.
- Integration: desktop launches local web bundle.
- E2E: smoke test packaged app on Windows/macOS.

### Error handling / edge cases

- Embedded API port conflict → dynamic port allocation.
- Desktop auto-update rollback on failed migration.

---

## Phase 11 — AI image generation (Azure OpenAI / DALL·E 3)

### Goal

Generate campaign images from prompts and optionally attach them to drafts with safety filters and cost controls.

### Exact steps with commands

```powershell
npm install -w packages/ai undici
mkdir packages\ai\src\images
```

### API connection details

- Azure docs:
  - `https://learn.microsoft.com/en-us/azure/ai-services/openai/dall-e-quickstart?tabs=rest`
- Recommended current options:
  - `dalle3` (GA)
  - keep architecture abstract to support `gpt-image-1*` later
- Azure requirements:
  - Azure subscription
  - Azure OpenAI resource
  - model deployment
  - endpoint + API key
- REST style:
  - `POST https://<resource>.openai.azure.com/openai/images/generations:submit?api-version=2024-02-01`
- DALL·E 3 specifics:
  - single image/request
  - sizes: `1024x1024`, `1024x1792`, `1792x1024`
  - qualities: `standard`, `hd`
  - styles: `natural`, `vivid`

### Local development setup

- Keep `ENABLE_AI_IMAGES=false` by default.
- Provide a stub image provider that returns fixture images from `tests\fixtures\images`.
- Add a startup health check that validates Azure endpoint shape only when the feature flag is on.

### Platform permissions & app registration

- Create Azure subscription/resource-group/OpenAI resource before enabling.
- Store the resource endpoint and key in local `.env`, never in the client bundle.
- If access to image models is limited in the tenant, keep the feature behind workspace-level allowlisting.

### Database schema additions

```sql
CREATE TABLE ai_media_generations (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  draft_id TEXT,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  provider TEXT NOT NULL DEFAULT 'azure-openai',
  model_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  result_media_asset_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE SET NULL,
  FOREIGN KEY (result_media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);
```

### UI/UX considerations

- Image prompt panel inside composer.
- Aspect presets: square, portrait, landscape.
- Cost/credit badge before generate.
- Show “AI generated” provenance metadata internally.

### Testing strategy

- Unit: prompt sanitization, result polling/parser.
- Integration: mocked Azure REST responses.
- E2E: generate image in stub mode and attach to draft.

### Error handling / edge cases

- Safety filter rejection → explain and preserve prompt draft.
- Slow generation → poll status with timeout + cancel.
- Generated size unsupported by chosen platform → offer crop/resize.

---

## Phase 12 — AI video generation (future / gated)

### Goal

Design extension points for future AI video generation without blocking current roadmap.

### Reality check

- Do **not** plan production delivery around Sora yet.
- As of current public Azure docs, there is **no generally available Azure-native public Sora REST API** to depend on.
- Implement a provider abstraction now; keep feature-flagged and experimental.

### Exact steps with commands

```powershell
mkdir packages\ai\src\video
```

### Local development setup

- Keep `ENABLE_VIDEO_GEN=false`.
- Use a stub provider that creates placeholder job records only.
- Do not expose controls to normal users until a real provider contract exists.

### Platform permissions & app registration

- None for now beyond future-provider evaluation.
- Treat vendor selection and legal/compliance review as a prerequisite task, not a build task.

### Architecture steps

1. Define `VideoGenerationProvider` interface.
2. Add experimental queue and status model.
3. Build UI only behind feature flag.
4. Support placeholder manual upload fallback.

### Database schema additions

```sql
CREATE TABLE ai_video_generations (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL,
  draft_id TEXT,
  provider TEXT NOT NULL,
  prompt TEXT NOT NULL,
  settings_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  output_media_asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (draft_id) REFERENCES post_drafts(id) ON DELETE SET NULL,
  FOREIGN KEY (output_media_asset_id) REFERENCES media_assets(id) ON DELETE SET NULL
);
```

### UI/UX considerations

- Mark feature as experimental.
- Expected durations in minutes, not seconds.
- Provide manual approval step before publish.

### Testing strategy

- Unit: provider interface only.
- Integration: stub provider.
- No production E2E until provider is real.

### Error handling / edge cases

- Provider unavailable → silently hide feature unless explicitly enabled.

---

## Phase 13 — Polish & hardening

### Goal

Secure, stabilize, document, monitor, and prepare for production.

### Exact steps with commands

```powershell
npm install -w apps/api rate-limiter-flexible pino pino-http
npm install -D @types/node
```

### Local development setup

- Add `npm run smoke` for API/web boot + migration checks.
- Run local production-like mode once per release candidate:
  - `cross-env NODE_ENV=production npm run build && npm run start`
- Verify logs, cookies, CSP, and queue behavior under production env flags.

### Hardening checklist

- CSP + secure headers
- CSRF protection on mutating browser routes
- request validation with Zod everywhere
- audit logs for auth/connect/publish/disconnect
- structured logs with correlation IDs
- backup/restore for SQLite
- migration smoke test in CI
- Playwright smoke on every PR
- secrets scanning in CI

### Additional database schema

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Testing strategy

- Unit coverage gate: 80% on shared/business logic
- Integration suite on every PR
- E2E smoke on every PR; full regression nightly
- Provider contract tests for each adapter

### Error handling / edge cases

- network flakiness
- token revocation
- provider schema changes
- migration rollback failure
- duplicate webhook events

---

# Appendix — Drizzle mirrors for phases 3–13

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const postDrafts = sqliteTable("post_drafts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  bodyText: text("body_text").notNull(),
  status: text("status").notNull().default("draft"),
  contentType: text("content_type").notNull().default("text"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const draftTargets = sqliteTable("draft_targets", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  socialAccountId: text("social_account_id").notNull().references(() => socialAccounts.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  targetKind: text("target_kind").notNull(),
  targetRef: text("target_ref").notNull(),
  position: integer("position").notNull().default(0),
});

export const draftMedia = sqliteTable("draft_media", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => postDrafts.id, { onDelete: "cascade" }),
  mediaAssetId: text("media_asset_id").notNull().references(() => mediaAssets.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  purpose: text("purpose").notNull().default("primary"),
});

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
});

export const publishJobs = sqliteTable("publish_jobs", {
  id: text("id").primaryKey(),
  scheduledPostId: text("scheduled_post_id").references(() => scheduledPosts.id, { onDelete: "cascade" }),
  draftTargetId: text("draft_target_id").notNull().references(() => draftTargets.id, { onDelete: "cascade" }),
  dedupeKey: text("dedupe_key").notNull().unique(),
  status: text("status").notNull().default("queued"),
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
});

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
});

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
});

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
});

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
});

export const analyticsSnapshots = sqliteTable("analytics_snapshots", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  socialAccountId: text("social_account_id").references(() => socialAccounts.id, { onDelete: "set null" }),
  providerPublishRecordId: text("provider_publish_record_id").references(() => providerPublishRecords.id, { onDelete: "set null" }),
  metricDate: text("metric_date").notNull(),
  metricsJson: text("metrics_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
```

---

# Platform registration checklist

## LinkedIn

- URL: `https://developer.linkedin.com/`
- Need:
  - app name, company page, logo, privacy policy URL, terms URL
  - redirect URIs
  - business justification for org scopes
- Scopes/products:
  - Sign In with LinkedIn
  - Share on LinkedIn
  - `w_member_social`
  - `w_organization_social` if posting as org
- Approval timeline:
  - member posting can be quick/self-service
  - org/marketing scopes can require manual approval; plan **1–3+ weeks**

## Meta (Facebook + Instagram)

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
- Approval timeline:
  - App Review often **5+ business days per review round**

## YouTube

- URL: `https://console.cloud.google.com/`
- Need:
  - OAuth consent screen
  - support email
  - privacy policy
  - verified domain for production
- Scopes:
  - `https://www.googleapis.com/auth/youtube.upload`
- Approval timeline:
  - internal/testing fast
  - public verification for sensitive scopes can take **days to weeks**

## TikTok

- URL: `https://developers.tiktok.com/`
- Need:
  - organization app
  - verified domain
  - privacy policy and terms
  - sandbox setup
  - UX audit compliance
- Scopes:
  - `video.publish`
  - optionally `video.upload`
- Approval timeline:
  - sandbox immediate
  - audit/review for public posting typically **1–3+ weeks**

---

# UI/UX wireframe descriptions

## Account Manager

- Left nav + page title
- Platform sections with “Connect account” CTA
- Each account row shows avatar, account name, handle, token state, scopes, last sync
- Bulk filters for active/error/reauth required

## Post Composer

- Three-column desktop layout:
  - left: editor + media
  - middle: settings + accounts + schedule
  - right: previews + warnings
- Sticky action bar with save/publish/schedule

## Campaign Planner

- Calendar/kanban toggle
- Campaign brief and AI assist in side panel
- Drag draft cards across dates/statuses

## Analytics Dashboard

- KPI row
- Trend charts
- Platform comparison
- Failed posts table with remediation actions

---

# Environment variable reference (`.env.example`)

```dotenv
# core
NODE_ENV=development
APP_URL=http://localhost:5173
API_URL=http://localhost:3001
PORT=3001
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=.\data\socialkeys.dev.sqlite
SESSION_SECRET=replace-me
ENCRYPTION_KEY=replace-with-32-byte-key
LOG_LEVEL=debug

# feature flags
PUBLISH_MODE=mock
SOCIAL_SANDBOX_ONLY=true
ENABLE_SCHEDULER=true
ENABLE_AI_TEXT=false
ENABLE_AI_IMAGES=false
ENABLE_VIDEO_GEN=false
ENABLE_ELECTRON=false

# uploads/media
UPLOAD_DIR=.\data\uploads
MAX_UPLOAD_MB=512
FFMPEG_PATH=
IMAGE_PUBLIC_BASE_URL=http://localhost:3001/media

# worker/scheduler
WORKER_INLINE=true
WORKER_ID=dev-worker-1
WORKER_POLL_MS=15000
JOB_LOCK_TIMEOUT_MS=120000
JOB_MAX_ATTEMPTS=5

# linkedin
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:3001/auth/callback/linkedin
LINKEDIN_API_VERSION=202602

# meta / facebook / instagram
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3001/auth/callback/facebook
META_GRAPH_VERSION=v25.0
INSTAGRAM_USE_FACEBOOK_LOGIN=true

# youtube
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback/youtube
YOUTUBE_UPLOAD_PRIVACY_STATUS=private
YOUTUBE_DEFAULT_CATEGORY_ID=22

# tiktok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3001/auth/callback/tiktok
TIKTOK_USE_SANDBOX=true
TIKTOK_MEDIA_PULL_DOMAIN=

# github copilot sdk
ENABLE_COPILOT_SDK=false
COPILOT_MODEL_PRIMARY=claude-opus-4.6
COPILOT_MODEL_FALLBACK=gpt-4.1

# azure openai images
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_API_KEY=
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_OPENAI_IMAGE_DEPLOYMENT=dalle3
AZURE_OPENAI_IMAGE_MODEL=dalle3

# future video
AI_VIDEO_PROVIDER=stub
AI_VIDEO_API_KEY=
```

---

# Suggested REST API surface

```text
GET    /health
GET    /ready
GET    /api/v1/me

GET    /api/v1/auth/:platform/start
GET    /api/v1/auth/:platform/callback
POST   /api/v1/auth/logout

GET    /api/v1/accounts
POST   /api/v1/accounts/:platform/connect
POST   /api/v1/accounts/:id/disconnect

GET    /api/v1/drafts
POST   /api/v1/drafts
GET    /api/v1/drafts/:id
PATCH  /api/v1/drafts/:id
POST   /api/v1/drafts/:id/media
POST   /api/v1/drafts/:id/publish
POST   /api/v1/drafts/:id/schedule

GET    /api/v1/scheduled-posts
GET    /api/v1/publish-jobs/:id

POST   /api/v1/ai/generate-text
POST   /api/v1/ai/rewrite
POST   /api/v1/ai/campaign-plan
POST   /api/v1/ai/generate-image

GET    /api/v1/campaigns
POST   /api/v1/campaigns
PATCH  /api/v1/campaigns/:id

GET    /api/v1/analytics/overview
GET    /api/v1/analytics/platforms
GET    /api/v1/analytics/campaigns
```

---

# CI/CD and release plan

## Minimum CI commands

```powershell
npm ci
npm run lint
npm run test
npm run build
npm run db:generate
```

## Recommended GitHub Actions jobs

1. `lint-test-build`
2. `playwright-smoke`
3. `migration-smoke`
4. `desktop-package` (later)

---

# Recommended execution order inside the team

1. Phase 1
2. Phase 2
3. Phase 3 + Phase 4 in parallel after contracts stabilize
4. Phase 5
5. Phase 6
6. Phase 7
7. Phase 8
8. Phase 9
9. Phase 13 hardening before public rollout
10. Phase 10/11/12 as expansion tracks

---

# Definition of done by milestone

## MVP done

- Workspace bootstrapped
- LinkedIn + Facebook working
- Multi-account support
- Composer with media + previews
- Scheduling + retries
- Mock mode + basic analytics

## V1 done

- Instagram + YouTube + TikTok supported
- AI copy assist live
- Campaign planner live
- Hardening complete

## VNext done

- Desktop app
- AI images
- Experimental AI video
