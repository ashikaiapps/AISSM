# SocialKeys.ai Implementation Plan

## Executive Summary

SocialKeys.ai is a comprehensive social media cross-posting application designed for power users and agencies. It leverages AI for content creation and optimization, supports multi-account management across major platforms, and provides advanced scheduling and analytics.

**Key Features:**
- **AI-Powered Content:** Claude Opus 4.6 (text), Azure DALL-E 3 (images), Azure Sora 2 (video).
- **Multi-Platform:** LinkedIn, Facebook, Instagram, YouTube Shorts, TikTok.
- **Multi-Account:** Manage multiple profiles per platform.
- **Unified Workflow:** Create once, optimize for each platform, schedule, and analyze.
- **Robust Tech Stack:** Node.js Monorepo, React/Vite/Tailwind, Express/SQLite/Drizzle.

---

## 1. Local Development Quickstart

**Prerequisites:**
- Node.js v20+
- pnpm (preferred) or npm
- Git
- SQLite (usually pre-installed or via better-sqlite3)

**Setup:**

1.  **Clone & Install:**
    ```bash
    git clone <repository-url> socialkeys-ai
    cd socialkeys-ai
    pnpm install
    ```

2.  **Environment Variables:**
    Copy `.env.example` to `.env` in the root and packages.
    ```bash
    cp .env.example .env
    # Fill in required API keys (see Environment Variable Reference)
    ```

3.  **Database Setup:**
    ```bash
    pnpm db:push  # Pushes schema to local SQLite db
    pnpm db:seed  # Seeds initial data
    ```

4.  **Run Development Servers:**
    ```bash
    pnpm dev
    # Frontend: http://localhost:5173
    # Backend: http://localhost:3000
    ```

---

## 2. Environment Variable Reference

Create a `.env` file in the root.

```env
# --- App Config ---
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secure-jwt-secret-key-at-least-32-chars

# --- Database ---
DATABASE_URL=file:./local.db

# --- AI Services ---
# GitHub Copilot SDK
GITHUB_COPILOT_API_KEY=your-github-copilot-api-key
# Azure AI
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# --- Social Platforms (OAuth) ---
# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# Facebook / Instagram
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

# YouTube (Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_CALLBACK_URL=http://localhost:3000/api/auth/tiktok/callback
```

---

## 3. Platform Registration Checklist

| Platform | URL | Required Info | Permissions/Scopes | Approval Timeline |
| :--- | :--- | :--- | :--- | :--- |
| **LinkedIn** | [LinkedIn Developers](https://www.linkedin.com/developers/) | App Name, Logo, Privacy Policy URL | `w_member_social`, `r_liteprofile` | Instant (Basic) |
| **Facebook/Instagram** | [Meta for Developers](https://developers.facebook.com/) | Business Verification (for some features) | `pages_manage_posts`, `instagram_basic`, `instagram_content_publish` | 1-2 Weeks (Business Verification) |
| **YouTube** | [Google Cloud Console](https://console.cloud.google.com/) | Project creation, OAuth consent screen | `https://www.googleapis.com/auth/youtube.upload` | Instant (Test mode), Weeks (Production quota) |
| **TikTok** | [TikTok for Developers](https://developers.tiktok.com/) | App details, Use case description | `video.upload`, `user.info.basic` | 1-3 Weeks |

---

## 4. Database Schema (Drizzle ORM)

Located in `packages/backend/src/db/schema.ts`.

```typescript
import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  platform: text('platform').notNull(), // 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'
  platformAccountId: text('platform_account_id').notNull(),
  name: text('name').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
  avatarUrl: text('avatar_url'),
});

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  content: text('content'), // Base content
  mediaUrls: text('media_urls'), // JSON array of URLs
  status: text('status').default('draft'), // draft, scheduled, published, failed
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const postVersions = sqliteTable('post_versions', {
  id: text('id').primaryKey(),
  postId: text('post_id').references(() => posts.id).notNull(),
  accountId: text('account_id').references(() => accounts.id).notNull(),
  platformContent: text('platform_content'), // Platform-specific content
  status: text('status').default('pending'), // pending, published, failed
  publishedUrl: text('published_url'),
  error: text('error'),
});
```

---

## 5. Phase-by-Phase Implementation

### Phase 1: Foundation
**Goal:** Set up monorepo, basic backend/frontend, database.

1.  **Monorepo Setup:**
    ```bash
    mkdir socialkeys-ai && cd socialkeys-ai
    pnpm init
    # Create pnpm-workspace.yaml
    mkdir packages/frontend packages/backend packages/shared
    ```

2.  **Backend (Express + SQLite):**
    - Initialize `packages/backend`: `npm init -y`, install `express`, `better-sqlite3`, `drizzle-orm`.
    - Setup Drizzle config and basic server.
    - Create health check endpoint.

3.  **Frontend (React + Vite):**
    - Initialize `packages/frontend`: `pnpm create vite . --template react-ts`.
    - Install `tailwindcss`, `postcss`, `autoprefixer`.
    - Setup React Router.

4.  **Shared:**
    - Initialize `packages/shared`: `npm init -y`.
    - Define TypeScript interfaces/types (e.g., `User`, `Post`).

5.  **Validation:**
    - Run backend and frontend concurrently.
    - Verify database creation (`local.db`).

### Phase 2: Adapter Framework & Multi-Account
**Goal:** Abstract social platforms and manage accounts.

1.  **Adapter Interface:**
    - Create `packages/backend/src/adapters/SocialAdapter.ts` interface:
      ```typescript
      interface SocialAdapter {
        authUrl(): string;
        authenticate(code: string): Promise<AuthResult>;
        post(content: PostContent): Promise<PostResult>;
        // ...
      }
      ```

2.  **Account Management API:**
    - CRUD endpoints for `accounts` table.
    - `POST /api/accounts/link/:platform` (Start OAuth flow).
    - `GET /api/accounts/callback/:platform` (Handle OAuth callback).

3.  **Frontend Account Manager:**
    - "Connect Account" buttons for each platform.
    - List of connected accounts with status and refresh token buttons.

### Phase 3: LinkedIn & Facebook Adapters
**Goal:** Implement first two major platforms.

1.  **LinkedIn Adapter:**
    - Implement `SocialAdapter` for LinkedIn.
    - Use `w_member_social` scope.
    - API: `https://api.linkedin.com/v2/ugcPosts`.

2.  **Facebook Adapter:**
    - Implement `SocialAdapter` for Facebook (Pages).
    - Use `pages_manage_posts`, `pages_read_engagement`.
    - API: Graph API `/me/feed`.

3.  **Testing:**
    - Create test accounts on LinkedIn/Facebook.
    - Verify OAuth flow and posting (text + image).

### Phase 4: Post Composer & Media Handling
**Goal:** UI for creating posts and handling file uploads.

1.  **File Upload Service:**
    - `POST /api/upload` endpoint (using `multer`).
    - Store files locally (dev) or S3/Azure Blob (prod).

2.  **Composer UI:**
    - Rich text editor (e.g., `tiptap` or similar).
    - Media drag-and-drop zone.
    - **Account Selector:** Checkboxes for which accounts to post to.
    - **Preview:** Live preview of how the post looks on selected platforms.

### Phase 5: Scheduling Engine
**Goal:** Schedule posts for future publication.

1.  **Scheduler Queue:**
    - Use `bullmq` (Redis) or a simple polling mechanism (for MVP/SQLite).
    - For SQLite-only: `node-cron` job running every minute to check `posts` where `status='scheduled'` and `scheduledAt <= now`.

2.  **Execution Logic:**
    - Iterate through `postVersions` for the due post.
    - Call appropriate adapter's `post()` method.
    - Update status to `published` or `failed`.

### Phase 6: Instagram, YouTube Shorts, TikTok Adapters
**Goal:** Expand to visual/video platforms.

1.  **Instagram:** Graph API `/media` endpoint (requires container upload then publish).
2.  **YouTube:** Google Data API v3 `videos.insert`.
3.  **TikTok:** TikTok Content Posting API.

*Note: Video handling requires checking processing status before publishing on some platforms.*

### Phase 7: AI Text Content (Copilot SDK)
**Goal:** AI assistance for drafting and refining posts.

1.  **Integration:**
    - Install `@github/copilot-sdk`.
    - Create backend service wrapping the SDK.

2.  **Features:**
    - "Generate Draft" from topic.
    - "Rewrite for [Platform]" (e.g., make it professional for LinkedIn, casual for TikTok).
    - "Fix Grammar/Spelling".

### Phase 8: AI Content Planner & Campaigns
**Goal:** Strategic content planning.

1.  **Campaign Entity:**
    - Group posts by `campaign_id`.
    - Define campaign goals and duration.

2.  **AI Planner:**
    - "Plan a week of content about [Topic]".
    - AI generates 5-7 post ideas with scheduled times.
    - User approves/edits -> converts to scheduled posts.

### Phase 9: Analytics Dashboard
**Goal:** Track performance.

1.  **Data Collection:**
    - Scheduled job to fetch engagement metrics (likes, shares, comments) for published posts.
    - Store in `analytics` table.

2.  **Dashboard UI:**
    - Aggregate charts (Total Reach, Engagement over time).
    - Per-post breakdown.

### Phase 10: Electron Desktop App
**Goal:** Native desktop experience.

1.  **Electron Setup:**
    - Add `electron` and `electron-builder`.
    - Main process wrapper around the Frontend.

2.  **Native Features:**
    - System notifications for failed/successful posts.
    - Native file system access for drag-and-drop.

### Phase 11 & 12: AI Image & Video Gen
**Goal:** Azure AI integration.

1.  **Image (DALL-E 3):**
    - `POST /api/ai/generate-image`.
    - Prompt -> Azure OpenAI -> Save Image -> Attach to Post.

2.  **Video (Sora):**
    - (Future/Preview) Similar flow for video generation.

### Phase 13: Polish & Hardening
- **Security:** Rate limiting, input sanitization.
- **Performance:** Image optimization, lazy loading.
- **UX:** Loading skeletons, toast notifications, error boundaries.

---

## 6. UI/UX Wireframe Descriptions

**1. Post Composer:**
- **Layout:** Two columns. Left: Editor; Right: Preview & Settings.
- **Editor:**
    - "What do you want to share?" text area.
    - Media upload dropzone below text.
    - "AI Assistant" button floating or in toolbar.
- **Right Panel:**
    - **Accounts:** List of connected avatars with checkboxes.
    - **Preview:** Card mimicking the social feed of the *currently focused* platform tab.
    - **Schedule:** Date/Time picker and "Schedule" vs "Post Now" buttons.

**2. Account Manager:**
- **Grid Layout:** Cards for each supported platform.
- **Card State (Unconnected):** Platform logo, greyed out, "Connect" button.
- **Card State (Connected):** User avatar, name, green "Active" dot, "Disconnect" or "Refresh Token" options.

**3. Calendar/Planner:**
- **View:** Monthly/Weekly calendar grid.
- **Items:** Small cards representing scheduled posts. Color-coded by platform or status (draft/scheduled/published).
- **Interactions:** Drag-and-drop to reschedule. Click to edit.

**4. Analytics Dashboard:**
- **Header:** Date range picker.
- **Top Row:** Key Metrics (Total Likes, Total Reach, Engagement Rate).
- **Main Chart:** Line graph showing engagement trends over time.
- **Bottom Table:** "Top Performing Posts" list.

---

## 7. Testing Strategy

- **Unit Tests:** Jest/Vitest for utility functions, AI prompt generators, and data transformers.
- **Integration Tests:** Supertest for API endpoints (mocking external social APIs).
- **E2E Tests:** Playwright/Cypress for critical user flows (Login -> Connect Account -> Create Post -> Schedule).

**Mocking:**
- Use `msw` (Mock Service Worker) to intercept calls to LinkedIn/Facebook APIs during development/testing to avoid spamming real accounts.
