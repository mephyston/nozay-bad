CREATE TABLE `check_deposits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`reference` text NOT NULL,
	`date` text NOT NULL,
	`amount` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`bank_transaction_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_transaction_id`) REFERENCES `bank_transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_deposits_reference_unique` ON `check_deposits` (`reference`);--> statement-breakpoint
CREATE TABLE `checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_deposit_id` integer,
	`season_id` text NOT NULL,
	`number` text NOT NULL,
	`amount` integer NOT NULL,
	`emitter` text NOT NULL,
	`bank` text,
	`member_id` integer,
	`transaction_id` integer,
	`status` text DEFAULT 'received' NOT NULL,
	`photo_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_deposit_id`) REFERENCES `check_deposits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
