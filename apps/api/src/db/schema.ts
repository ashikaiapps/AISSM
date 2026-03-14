import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- Users & Teams ---

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// --- Connected Social Accounts ---

export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // linkedin | facebook | instagram | youtube | tiktok
  platformAccountId: text('platform_account_id').notNull(),
  accountName: text('account_name').notNull(),
  handle: text('handle'),
  accountType: text('account_type'), // page | profile | business | creator | channel
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata').notNull().default('{}'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uq_account_platform').on(table.userId, table.platform, table.platformAccountId),
  index('idx_accounts_user_platform').on(table.userId, table.platform),
]);

// --- OAuth Tokens (encrypted) ---

export const oauthTokens = sqliteTable('oauth_tokens', {
  id: text('id').primaryKey(),
  socialAccountId: text('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenType: text('token_type').notNull().default('Bearer'),
  scopes: text('scopes').notNull(),
  expiresAt: text('expires_at'),
  refreshExpiresAt: text('refresh_expires_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_tokens_account').on(table.socialAccountId),
]);

// --- Posts ---

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  caption: text('caption').notNull().default(''),
  status: text('status').notNull().default('draft'), // draft | publishing | published | failed
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_posts_user_status').on(table.userId, table.status),
]);

// --- Post → Account targets ---

export const postAccounts = sqliteTable('post_accounts', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  socialAccountId: text('social_account_id').notNull().references(() => socialAccounts.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending | publishing | published | failed
  platformPostId: text('platform_post_id'),
  publishedUrl: text('published_url'),
  error: text('error'),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_post_accounts_post').on(table.postId),
  index('idx_post_accounts_status').on(table.status),
]);

// --- Post Media ---

export const postMedia = sqliteTable('post_media', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  originalFilename: text('original_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  width: integer('width'),
  height: integer('height'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_media_post').on(table.postId),
]);

// --- Inspiration Feed ---

export const inspirationSources = sqliteTable('inspiration_sources', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // reddit | hackernews | rss | youtube | producthunt
  name: text('name').notNull(),
  config: text('config').notNull().default('{}'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  fetchIntervalMinutes: integer('fetch_interval_minutes').notNull().default(30),
  lastFetchedAt: text('last_fetched_at'),
  errorCount: integer('error_count').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_sources_user').on(table.userId),
  index('idx_sources_type').on(table.type),
  index('idx_sources_next_fetch').on(table.isActive, table.lastFetchedAt),
]);

export const inspirationItems = sqliteTable('inspiration_items', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => inspirationSources.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  url: text('url').notNull(),
  authorName: text('author_name'),
  authorUrl: text('author_url'),
  thumbnailUrl: text('thumbnail_url'),
  score: integer('score'),
  commentCount: integer('comment_count'),
  publishedAt: text('published_at'),
  metadata: text('metadata').notNull().default('{}'),
  status: text('status').notNull().default('unread'),
  isSaved: integer('is_saved', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  draftPostId: text('draft_post_id').references(() => posts.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex('uq_item_external').on(table.sourceId, table.externalId),
  index('idx_items_user_status').on(table.userId, table.status),
  index('idx_items_user_saved').on(table.userId, table.isSaved),
  index('idx_items_source').on(table.sourceId),
  index('idx_items_type_score').on(table.type, table.score),
  index('idx_items_published').on(table.publishedAt),
]);

export const inspirationSyncRuns = sqliteTable('inspiration_sync_runs', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => inspirationSources.id, { onDelete: 'cascade' }),
  trigger: text('trigger').notNull().default('scheduled'),
  status: text('status').notNull().default('queued'),
  startedAt: text('started_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text('finished_at'),
  itemsFetched: integer('items_fetched').notNull().default(0),
  itemsInserted: integer('items_inserted').notNull().default(0),
  error: text('error'),
}, (table) => [
  index('idx_sync_source_started').on(table.sourceId, table.startedAt),
  index('idx_sync_status_started').on(table.status, table.startedAt),
]);
