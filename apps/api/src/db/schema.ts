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
