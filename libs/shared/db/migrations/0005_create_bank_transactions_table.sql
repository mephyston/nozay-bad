CREATE TABLE `bank_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fitid` text NOT NULL,
	`season_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`memo` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_transactions_fitid_unique` ON `bank_transactions` (`fitid`);