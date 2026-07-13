CREATE TABLE `seasons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `seasons` (`id`, `name`, `active`, `created_at`) VALUES ('25-26', 'Saison 2025-2026', 1, strftime('%s', 'now') * 1000);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`season` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text NOT NULL,
	`email` text,
	`phone` text,
	`status` text DEFAULT 'valide' NOT NULL,
	`type` text NOT NULL,
	`imported_at` integer NOT NULL,
	FOREIGN KEY (`season`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_members`("id", "licence", "season", "last_name", "first_name", "gender", "birth_date", "email", "phone", "status", "type", "imported_at") SELECT "id", "licence", "season", "last_name", "first_name", "gender", "birth_date", "email", "phone", "status", "type", "imported_at" FROM `members`;--> statement-breakpoint
DROP TABLE `members`;--> statement-breakpoint
ALTER TABLE `__new_members` RENAME TO `members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `members_licence_season_idx` ON `members` (`licence`,`season`);