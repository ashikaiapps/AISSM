# SocialKeys.ai — Plan Assessment

## Executive Summary

The existing super plan is a genuinely impressive piece of engineering documentation. It provides a 13-phase roadmap with exact shell commands, Drizzle ORM schemas, REST API surface definitions, platform-by-platform OAuth registration steps, and UI wireframe descriptions. The local-first, mock-first, zero-external-infrastructure philosophy is sound and developer-friendly. The adapter pattern is well-conceived, and the SQLite-backed job queue is a pragmatic MVP choice that avoids premature infrastructure complexity.

However, the plan has several critical gaps that would cause real pain during implementation. The database schema lacks indexes entirely — a scheduling app that queries by `status`, `scheduled_for`, `workspace_id`, and `platform` hundreds of times per minute will degrade rapidly. The LinkedIn API scopes reference `r_liteprofile`, which was deprecated in August 2023 and will fail on any new app. The Drizzle schema uses `text("is_active", { mode: "boolean" })` which is incorrect for SQLite — it must be `integer` with `mode: "boolean"`. Security fundamentals like CSRF implementation, cookie configuration, and ENCRYPTION_KEY generation are mentioned but never specified. There is no rate limiting on the application's own API, no SQLite backup strategy, no structured logging until Phase 13, and no workspace membership model — making multi-user workspaces impossible.

The plan also under-serves the TikTok integration by failing to explain that TikTok's Content Posting API requires a **publicly accessible HTTPS URL** for media pull, which fundamentally conflicts with the local-first architecture. Instagram Reels publishing (a major content format) is entirely absent. Facebook personal profile posting is referenced implicitly but has been deprecated since 2024 — only Page posting is available. These are the kinds of platform-specific gotchas that will derail a sprint if discovered during implementation rather than during planning.

## Strengths

- **Excellent local-first philosophy**: Zero external infrastructure for development (no Redis, no cloud storage, no live API keys needed to start building)
- **Comprehensive monorepo structure**: Clear package boundaries (`@socialkeys/adapters`, `@socialkeys/database`, `@socialkeys/shared`, etc.) with proper workspace configuration
- **Well-defined adapter interface**: The `SocialAdapter` contract provides a clean abstraction over platform differences
- **Detailed phase progression**: 13 phases with exact `npm install` commands, file lists, and shell commands — a developer can follow these mechanically
- **Strong schema design foundation**: Drizzle ORM schemas with proper foreign keys, cascade deletes, and a sensible table progression across phases
- **Immutable publish records**: The `providerPublishRecords` table captures full provider responses — excellent for debugging and audit
- **Idempotent job design**: `dedupeKey` on `publishJobs` prevents double-publishes after retries
- **Platform-specific rate limits documented**: Instagram 100/24h, TikTok 6/min, YouTube 10K units/day — these are real numbers
- **Mock mode is first-class**: `PUBLISH_MODE=mock` is not an afterthought; it's the default development experience
- **Scheduling architecture is pragmatic**: SQLite-backed queue with inline workers avoids Redis dependency while preserving the right abstractions for later scale-out
- **Audit log table included**: `audit_logs` table with entity-level tracking is production-ready
- **Feature flags everywhere**: Every AI capability, every platform, and the scheduler are independently toggleable

## Weaknesses & Gaps

### Critical (Will block or break implementation)

- **🔴 No database indexes defined anywhere**: The entire schema (14+ tables) has zero explicit indexes. Queries on `publish_jobs.status`, `scheduled_posts.scheduled_for`, `social_accounts.workspace_id + platform`, `draft_targets.draft_id`, etc. will table-scan as data grows. SQLite performance degrades noticeably at 10K+ rows without indexes.

- **🔴 LinkedIn `r_liteprofile` scope is deprecated**: The registration table lists `r_liteprofile` which was deprecated August 2023. New apps MUST use OpenID Connect scopes: `openid`, `profile`, `email`. Any implementation following this plan will get `unauthorized_scope_error` immediately.

- **🔴 Drizzle `isActive` column uses wrong type**: `text("is_active", { mode: "boolean" })` is incorrect. SQLite booleans in Drizzle must use `integer("is_active", { mode: "boolean" })`. This will cause runtime type mismatches.

- **🔴 No workspace membership table**: The schema has `users` and `workspaces` but no join table (`workspace_members`). This means only the owner can access a workspace. Multi-user workspaces — a core feature for teams — are architecturally impossible without a schema change.

- **🔴 TikTok media pull requires public HTTPS URL**: The `TIKTOK_MEDIA_PULL_DOMAIN` env var is listed but never explained. TikTok's Content Posting API `PULL_FROM_URL` method requires a **publicly accessible HTTPS domain with verified ownership**. This fundamentally conflicts with the local-first architecture. The plan must address this with either chunked upload (`FILE_UPLOAD`) as the primary path, or a tunneling/CDN strategy.

- **🔴 SESSION_SECRET and ENCRYPTION_KEY have no validation**: `.env.example` has `SESSION_SECRET=replace-me` and `ENCRYPTION_KEY=replace-with-32-byte-key`. There is no boot-time validation that these were actually replaced. Developers WILL run with placeholder values, resulting in predictable session tokens and weak encryption.

### High (Will cause significant rework or bugs)

- **🟠 No rate limiting on the application's own API**: Any client can hammer the REST API with unlimited requests. No mention of `express-rate-limit` or per-endpoint throttling until Phase 13's hardening checklist, which is too late.

- **🟠 No structured logging until Phase 13**: Pino is added in the final hardening phase. Without structured logging from Phase 1, debugging OAuth flows, adapter failures, and scheduling issues will rely on `console.log`. Correlation IDs, request tracing, and log levels should be foundational.

- **🟠 Facebook personal profile posting is deprecated**: The plan references Facebook posting without explicitly stating that **only Page posting is supported via API**. Personal profile and Group posting via API was fully deprecated in 2024. This must be documented to prevent developer confusion.

- **🟠 Instagram Reels publishing is absent**: Instagram Reels (via `media_type=REELS`) is a major content format and is fully supported by the Content Publishing API. The plan only covers image publishing and mentions "no Stories" but never addresses Reels. This is a significant feature gap.

- **🟠 No `updatedAt` auto-update mechanism**: SQLite doesn't have MySQL-style `ON UPDATE CURRENT_TIMESTAMP`. Every table with `updatedAt` needs either a SQLite trigger or application-level middleware. This is never mentioned.

- **🟠 Missing composite unique constraint in Drizzle**: The SQL schema has `UNIQUE(workspace_id, platform, external_account_id)` on `social_accounts`, but the Drizzle schema definition doesn't include this constraint. Duplicate accounts will slip through.

- **🟠 No React error boundaries**: The frontend architecture mentions no error boundary strategy. A single adapter failure rendering a preview will crash the entire composer.

- **🟠 No OpenAPI/Swagger documentation**: The REST API surface is documented in markdown but there's no auto-generated API docs. Developers building the frontend will constantly reference the plan instead of live documentation.

- **🟠 Adapter contract is incomplete**: Missing methods: `deletePost()`, `getPostStatus()` (needed for async publishing like Instagram containers), `getAccountCapabilities()`, and `revokeAccess()`.

- **🟠 No component library decision**: Building accessible UI components from scratch with just Tailwind is slow and error-prone. No mention of Radix UI, shadcn/ui, Headless UI, or similar.

### Medium (Will cause friction or technical debt)

- **🟡 `npm init -y` in quickstart is wrong**: The quickstart says to run `npm init -y` after cloning, which would overwrite the existing `package.json`. Should just be `npm install`.

- **🟡 No seed data in Phase 1**: `npm run seed:campaigns` appears in Phase 8 but there's no general seed command. New developers see empty UIs with no data until they manually create records.

- **🟡 Cross-platform path issues**: `DATABASE_URL=.\data\socialkeys.dev.sqlite` uses Windows backslashes. This will fail on macOS/Linux. Should use `./data/socialkeys.dev.sqlite` or a path resolution helper.

- **🟡 No SQLite WAL mode specification**: Default journal mode causes read contention under concurrent access. WAL mode should be enabled at database initialization.

- **🟡 No graceful shutdown handling**: When the server stops, in-flight publish jobs will be abandoned mid-execution. Need SIGTERM/SIGINT handlers that drain the job queue.

- **🟡 LINKEDIN_API_VERSION=202602**: This appears to reference February 2026, which doesn't exist yet. LinkedIn API versions are YYYYMM format. This should be a current valid version (e.g., `202501`).

- **🟡 No dark mode strategy**: Not mentioned anywhere. Modern apps need dark mode support, especially for a tool creators use for hours daily.

- **🟡 Accessibility is surface-level**: "WCAG 2.2 AA" and "keyboard navigation" are mentioned but no concrete ARIA patterns, focus trap strategy for modals, or screen reader testing approach is defined.

- **🟡 No data export/portability feature**: Users have no way to export their drafts, campaigns, or analytics data.

- **🟡 Meta Graph API version pinning**: `v25.0` will expire. Need a version upgrade strategy and deprecation monitoring.

- **🟡 `draft_snapshots` table missing from canonical schema**: Phase 4 introduces `draft_snapshots` for autosave, but it's absent from the Phase 3-13 canonical schema block in Section G.

### Low (Minor issues or nice-to-haves)

- **🟢 No hot reload strategy for API**: tsx watch? nodemon? Not specified for the API dev server.
- **🟢 No FFmpeg prerequisite in quickstart**: Phase 4 requires FFmpeg but it's not in the Phase 1 prerequisites.
- **🟢 No animation/transition library**: Framer Motion or similar not mentioned for micro-interactions.
- **🟢 No toast notification system chosen**: Referenced but no library (sonner, react-hot-toast, etc.) selected.
- **🟢 Cookie security not fully specified**: httpOnly, SameSite, Secure, Domain attributes not defined.

## Missing Items (Not Covered At All)

1. **SQLite backup and restore strategy** — The production database is a single file. No backup schedule, no point-in-time recovery, no corruption detection.

2. **Health checks for connected accounts** — No periodic validation that OAuth tokens are still valid. Users discover broken connections only when a publish fails.

3. **Content moderation for user-authored posts** — AI safety checks exist for AI-generated content but not for user-written content that might violate platform policies.

4. **API versioning and deprecation strategy** — `/api/v1/` exists but there's no plan for v2, breaking changes, or version sunset.

5. **Database migration rollback strategy** — Forward migrations exist but no rollback path. A bad migration in production is unrecoverable.

6. **Webhook receiver architecture** — Some platforms (Meta, TikTok) send status webhooks. No webhook ingestion endpoint is planned.

7. **File cleanup / garbage collection** — Media assets uploaded but never attached to a published draft will accumulate indefinitely in `./data/uploads/`.

8. **CSP (Content Security Policy) specifics** — "CSP + secure headers" is listed but no actual policy is defined.

9. **Multi-tab / concurrent editing safety** — Two tabs editing the same draft will silently overwrite each other.

10. **Timezone handling in the UI** — The scheduler stores UTC + timezone, but the UI timezone picker behavior, user-local display, and DST edge cases are undefined.

11. **YouTube Shorts detection criteria** — "Shorts classification depends on video properties" is vague. Must be: vertical aspect ratio (9:16), ≤60 seconds, and `#Shorts` in title/description.

12. **Instagram carousel/multi-image publishing** — The IG adapter only covers single image/video. Carousel posts are a major format.

## Recommendations

### Immediate (Before Any Implementation Begins)

1. **Add database indexes to every schema definition** — At minimum: `publish_jobs(status, run_after)`, `scheduled_posts(status, scheduled_for)`, `social_accounts(workspace_id, platform)`, `draft_targets(draft_id)`, `oauth_tokens(social_account_id)`, `analytics_snapshots(workspace_id, metric_date)`.

2. **Fix LinkedIn scopes** — Replace `r_liteprofile` with `openid`, `profile`, `email` everywhere.

3. **Fix Drizzle boolean** — Change `text("is_active", { mode: "boolean" })` to `integer("is_active", { mode: "boolean" })`.

4. **Add `workspace_members` table** — `(id, workspace_id, user_id, role, invited_at, accepted_at)` with roles: `owner`, `admin`, `editor`, `viewer`.

5. **Validate secrets on boot** — Fail startup if `SESSION_SECRET` is `replace-me` or `ENCRYPTION_KEY` is not exactly 32 bytes.

6. **Document TikTok media strategy** — Use `FILE_UPLOAD` (chunked upload) as primary path for local-first; reserve `PULL_FROM_URL` for production deployments with CDN.

### Phase 1 Additions

7. **Add Pino structured logging from day one** — Don't wait for Phase 13. Every request should have a correlation ID.

8. **Add `express-rate-limit` from day one** — Even basic per-IP rate limiting prevents accidental abuse during development.

9. **Enable SQLite WAL mode** — Add `PRAGMA journal_mode=WAL;` to database initialization.

10. **Choose a component library** — Recommend shadcn/ui (Radix primitives + Tailwind) for accessible, composable components.

11. **Add `npm run seed` command** — Seed users, workspaces, and sample data from Phase 1.

12. **Specify cookie configuration** — `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'`, `maxAge: 7 days`.

### Architecture Improvements

13. **Add `getPostStatus()` and `deletePost()` to adapter interface** — Instagram container polling requires `getPostStatus()`. Post deletion is a user expectation.

14. **Add Instagram Reels support** — Include `media_type=REELS` in the Instagram adapter with 9:16 aspect ratio validation.

15. **Add webhook receiver endpoints** — `POST /api/v1/webhooks/:platform` for async status updates.

16. **Add `updatedAt` trigger or middleware** — Either SQLite triggers or a Drizzle middleware that sets `updatedAt` on every update.

17. **Add React error boundaries** — Wrap platform previews, the composer, and the analytics dashboard in independent error boundaries.

18. **Add OpenAPI spec generation** — Use `zod-to-openapi` or similar to auto-generate API documentation from Zod schemas.

### Before Production

19. **Implement SQLite backup** — Automated `.backup` command on a schedule, with integrity checks via `PRAGMA integrity_check`.

20. **Add media garbage collection** — Background job that removes orphaned files from `./data/uploads/` after 30 days.

21. **Add health check polling for connected accounts** — Weekly token validation that marks accounts as `needs_reauth` proactively.

22. **Define CSP policy** — `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://api.linkedin.com https://graph.facebook.com ...`
