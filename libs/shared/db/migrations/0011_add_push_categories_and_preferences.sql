ALTER TABLE `push_messages` ADD `category` text DEFAULT 'announcement' NOT NULL;--> statement-breakpoint
CREATE TABLE `push_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`category` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_preferences_email_category_idx` ON `push_preferences` (`email`,`category`);
