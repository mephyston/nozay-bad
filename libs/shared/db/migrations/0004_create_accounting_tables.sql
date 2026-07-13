CREATE TABLE `season_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`account_id` text NOT NULL,
	`initial_balance` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `season_account_idx` ON `season_balances` (`season_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`type` text NOT NULL,
	`account_id` text NOT NULL,
	`destination_account_id` text,
	`category` text,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`payment_method` text NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`season` text DEFAULT '25-26' NOT NULL,
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