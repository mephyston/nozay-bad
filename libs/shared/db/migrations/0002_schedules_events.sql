CREATE TABLE `club_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`all_day` integer DEFAULT false NOT NULL,
	`category` text NOT NULL,
	`venue_label` text,
	`description_html` text,
	`external_url` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_events_slug_unique` ON `club_events` (`slug`);--> statement-breakpoint
CREATE INDEX `club_events_status_starts_idx` ON `club_events` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `schedule_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`venue_id` integer NOT NULL,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`audience` text NOT NULL,
	`label` text,
	`coach_name` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `schedule_slots_season_weekday_idx` ON `schedule_slots` (`season_code`,`weekday`,`start_time`);--> statement-breakpoint
CREATE INDEX `schedule_slots_audience_idx` ON `schedule_slots` (`audience`);--> statement-breakpoint
CREATE TABLE `venues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`street_address` text,
	`postal_code` text,
	`city` text,
	`latitude` text,
	`longitude` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `venues_code_unique` ON `venues` (`code`);