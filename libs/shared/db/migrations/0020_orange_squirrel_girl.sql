CREATE TABLE `season_category_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`category_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
