PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bank_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fitid` text NOT NULL,
	`season_id` text NOT NULL,
	`account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`memo` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`ai_suggestions` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_bank_transactions`("id", "fitid", "season_id", "account_id", "amount", "date", "name", "memo", "status", "ai_suggestions", "created_at") SELECT "id", "fitid", "season_id", "account_id", "amount", "date", "name", "memo", "status", "ai_suggestions", "created_at" FROM `bank_transactions`;--> statement-breakpoint
DROP TABLE `bank_transactions`;--> statement-breakpoint
ALTER TABLE `__new_bank_transactions` RENAME TO `bank_transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `bank_transactions_fitid_unique` ON `bank_transactions` (`fitid`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `status` text DEFAULT 'cleared' NOT NULL;