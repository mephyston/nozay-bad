CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`amount` integer NOT NULL,
	`photo_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`emitter_name` text NOT NULL,
	`member_id` integer,
	`transaction_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
