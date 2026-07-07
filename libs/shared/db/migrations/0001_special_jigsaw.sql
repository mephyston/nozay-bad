CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text NOT NULL,
	`email` text,
	`phone` text,
	`status` text DEFAULT 'valide' NOT NULL,
	`type` text NOT NULL,
	`imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_licence_unique` ON `members` (`licence`);