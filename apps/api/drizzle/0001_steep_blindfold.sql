CREATE TABLE `inspiration_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`user_id` text NOT NULL,
	`external_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`url` text NOT NULL,
	`author_name` text,
	`author_url` text,
	`thumbnail_url` text,
	`score` integer,
	`comment_count` integer,
	`published_at` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'unread' NOT NULL,
	`is_saved` integer DEFAULT false NOT NULL,
	`notes` text,
	`draft_post_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `inspiration_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`draft_post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_item_external` ON `inspiration_items` (`source_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `idx_items_user_status` ON `inspiration_items` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_items_user_saved` ON `inspiration_items` (`user_id`,`is_saved`);--> statement-breakpoint
CREATE INDEX `idx_items_source` ON `inspiration_items` (`source_id`);--> statement-breakpoint
CREATE INDEX `idx_items_type_score` ON `inspiration_items` (`type`,`score`);--> statement-breakpoint
CREATE INDEX `idx_items_published` ON `inspiration_items` (`published_at`);--> statement-breakpoint
CREATE TABLE `inspiration_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`fetch_interval_minutes` integer DEFAULT 30 NOT NULL,
	`last_fetched_at` text,
	`error_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sources_user` ON `inspiration_sources` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sources_type` ON `inspiration_sources` (`type`);--> statement-breakpoint
CREATE INDEX `idx_sources_next_fetch` ON `inspiration_sources` (`is_active`,`last_fetched_at`);--> statement-breakpoint
CREATE TABLE `inspiration_sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`trigger` text DEFAULT 'scheduled' NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text,
	`items_fetched` integer DEFAULT 0 NOT NULL,
	`items_inserted` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`source_id`) REFERENCES `inspiration_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sync_source_started` ON `inspiration_sync_runs` (`source_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_sync_status_started` ON `inspiration_sync_runs` (`status`,`started_at`);