PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP INDEX `categories_code_unique`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `code`;--> statement-breakpoint
CREATE TABLE `__new_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`description` text NOT NULL,
	`category` integer NOT NULL,
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
--> statement-breakpoint
INSERT INTO `__new_expenses`("id", "season_id", "description", "category", "amount", "photo_url", "status", "emitter_name", "member_id", "transaction_id", "created_at") SELECT "id", "season_id", "description", "category", "amount", "photo_url", "status", "emitter_name", "member_id", "transaction_id", "created_at" FROM `expenses`;--> statement-breakpoint
DROP TABLE `expenses`;--> statement-breakpoint
ALTER TABLE `__new_expenses` RENAME TO `expenses`;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` text NOT NULL,
	`type` text NOT NULL,
	`account_id` text NOT NULL,
	`destination_account_id` text,
	`category` integer,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`payment_method` text NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`member_id` integer,
	`bank_transaction_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_transaction_id`) REFERENCES `bank_transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "season_id", "type", "account_id", "destination_account_id", "category", "amount", "date", "payment_method", "description", "reference", "member_id", "bank_transaction_id", "created_at") SELECT "id", "season_id", "type", "account_id", "destination_account_id", "category", "amount", "date", "payment_method", "description", "reference", "member_id", "bank_transaction_id", "created_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
UPDATE `transactions` SET `category` = 1 WHERE `category` = 'adhesions_inscriptions';--> statement-breakpoint
UPDATE `transactions` SET `category` = 2 WHERE `category` = 'sponsoring';--> statement-breakpoint
UPDATE `transactions` SET `category` = 3 WHERE `category` = 'subventions';--> statement-breakpoint
UPDATE `transactions` SET `category` = 4 WHERE `category` = 'actions_jeunes';--> statement-breakpoint
UPDATE `transactions` SET `category` = 5 WHERE `category` = 'tournois_senior';--> statement-breakpoint
UPDATE `transactions` SET `category` = 6 WHERE `category` = 'evenements_buvettes';--> statement-breakpoint
UPDATE `transactions` SET `category` = 7 WHERE `category` = 'cordage_vente';--> statement-breakpoint
UPDATE `transactions` SET `category` = 8 WHERE `category` = 'volants';--> statement-breakpoint
UPDATE `transactions` SET `category` = 9 WHERE `category` = 'salaires_charges';--> statement-breakpoint
UPDATE `transactions` SET `category` = 10 WHERE `category` = 'materiel_club';--> statement-breakpoint
UPDATE `transactions` SET `category` = 11 WHERE `category` = 'licences_federation';--> statement-breakpoint
UPDATE `transactions` SET `category` = 12 WHERE `category` = 'championnats';--> statement-breakpoint
UPDATE `transactions` SET `category` = 13 WHERE `category` = 'stages_formations';--> statement-breakpoint
UPDATE `transactions` SET `category` = 14 WHERE `category` = 'fonctionnement_administratif';--> statement-breakpoint
UPDATE `expenses` SET `category` = 1 WHERE `category` = 'adhesions_inscriptions';--> statement-breakpoint
UPDATE `expenses` SET `category` = 2 WHERE `category` = 'sponsoring';--> statement-breakpoint
UPDATE `expenses` SET `category` = 3 WHERE `category` = 'subventions';--> statement-breakpoint
UPDATE `expenses` SET `category` = 4 WHERE `category` = 'actions_jeunes';--> statement-breakpoint
UPDATE `expenses` SET `category` = 5 WHERE `category` = 'tournois_senior';--> statement-breakpoint
UPDATE `expenses` SET `category` = 6 WHERE `category` = 'evenements_buvettes';--> statement-breakpoint
UPDATE `expenses` SET `category` = 7 WHERE `category` = 'cordage_vente';--> statement-breakpoint
UPDATE `expenses` SET `category` = 8 WHERE `category` = 'volants';--> statement-breakpoint
UPDATE `expenses` SET `category` = 9 WHERE `category` = 'salaires_charges';--> statement-breakpoint
UPDATE `expenses` SET `category` = 10 WHERE `category` = 'materiel_club';--> statement-breakpoint
UPDATE `expenses` SET `category` = 11 WHERE `category` = 'licences_federation';--> statement-breakpoint
UPDATE `expenses` SET `category` = 12 WHERE `category` = 'championnats';--> statement-breakpoint
UPDATE `expenses` SET `category` = 13 WHERE `category` = 'stages_formations';--> statement-breakpoint
UPDATE `expenses` SET `category` = 14 WHERE `category` = 'fonctionnement_administratif';--> statement-breakpoint
PRAGMA foreign_keys=ON;