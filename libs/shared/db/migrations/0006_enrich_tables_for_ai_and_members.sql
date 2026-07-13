ALTER TABLE `bank_transactions` ADD `ai_suggestions` text;--> statement-breakpoint
ALTER TABLE `members` ADD `amount_due` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `amount_received` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `amount_remaining` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `paid` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `members` ADD `parent1_name` text;--> statement-breakpoint
ALTER TABLE `members` ADD `parent1_email` text;--> statement-breakpoint
ALTER TABLE `members` ADD `parent1_phone` text;--> statement-breakpoint
ALTER TABLE `members` ADD `parent2_name` text;--> statement-breakpoint
ALTER TABLE `members` ADD `parent2_email` text;--> statement-breakpoint
ALTER TABLE `members` ADD `parent2_phone` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `member_id` integer REFERENCES members(id);