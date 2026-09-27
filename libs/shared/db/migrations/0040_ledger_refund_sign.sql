-- Une recette peut être **négative** : c'est un remboursement.
--
-- Le trop-perçu d'une cotisation — payée par l'adhérente, puis par son CSE — se rend. En
-- comptabilité associative, ce n'est ni une charge ni une recette nouvelle : c'est une
-- diminution de la recette, dans sa propre catégorie. L'application l'écrit en recette de
-- montant négatif (interrupteur « Remboursement », 25/09/2026), et tout ce qui lit les
-- écritures le compte déjà juste : soldes, résultat, cumul signé du rapprochement, total
-- réglé de l'adhérent.
--
-- Seul le CHECK de la 0023 l'interdisait : `amount_cents > 0`, le sens étant porté par le
-- type. Le remboursement échouait donc en base, avec une erreur de contrainte. Il devient :
-- positif, **ou** recette négative. Une dépense, une jambe de virement et un montant nul
-- restent refusés.
--
-- Migration **destructive** (SQLite ne modifie pas un CHECK : la table est reconstruite),
-- sur le modèle exact de la 0023 : les identifiants d'écriture sont conservés, le lien des
-- chèques est mis de côté puis rétabli, les index sont recréés à l'identique. Rien d'autre
-- ne change dans la table.

-- 1. `checks` référence des écritures : on détache le temps de la reconstruction (même raison
-- que la 0023 — un DROP sur une table parente déclenche le contrôle de clé étrangère, et l'effet
-- d'un PRAGMA dans une migration D1 n'est pas garanti).
CREATE TABLE `_checks_ledger_link` (`check_id` integer NOT NULL, `ledger_entry_id` integer NOT NULL);
--> statement-breakpoint
INSERT INTO `_checks_ledger_link` (`check_id`, `ledger_entry_id`)
SELECT `id`, `ledger_entry_id` FROM `checks` WHERE `ledger_entry_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `checks` SET `ledger_entry_id` = NULL;
--> statement-breakpoint

-- 2. Le compteur d'identifiants, pour qu'aucun identifiant d'écriture supprimée ne resserve :
-- une commande ou une note de frais qui la désignait encore la retrouverait sous un autre sens.
CREATE TABLE `_ledger_seq` AS SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'ledger_entries';
--> statement-breakpoint

-- 3. La table reconstruite : colonnes, clés et CHECK de virement identiques à la 0023 ; seul
-- le CHECK de montant change.
CREATE TABLE `ledger_entries_rebuilt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`type` text NOT NULL,
	`account_id` integer NOT NULL,
	`transfer_id` integer,
	`transfer_leg` text,
	`category_id` integer,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`payment_method_id` integer NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`accrual_type` text DEFAULT 'normal' NOT NULL,
	`accrual_note` text,
	`member_id` integer,
	`bank_statement_line_id` integer,
	`invoice_id` integer,
	`status` text DEFAULT 'cleared' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_id`) REFERENCES `internal_transfers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_statement_line_id`) REFERENCES `bank_statement_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	-- Colonnes citées sans préfixe de table : voir la 0023 (le RENAME ne saurait plus le résoudre).
	CONSTRAINT "ledger_entries_amount_cents_check" CHECK("amount_cents" > 0 OR ("type" = 'recette' AND "amount_cents" < 0)),
	CONSTRAINT "ledger_entries_transfert_check" CHECK(("type" = 'transfert' AND "transfer_id" IS NOT NULL AND "transfer_leg" IN ('source', 'destination') AND "category_id" IS NULL) OR ("type" <> 'transfert' AND "transfer_id" IS NULL AND "transfer_leg" IS NULL))
);
--> statement-breakpoint
INSERT INTO `ledger_entries_rebuilt` (`id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT `id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`
FROM `ledger_entries`;
--> statement-breakpoint

-- 4. Bascule.
DROP TABLE `ledger_entries`;
--> statement-breakpoint
ALTER TABLE `ledger_entries_rebuilt` RENAME TO `ledger_entries`;
--> statement-breakpoint
UPDATE `sqlite_sequence`
SET `seq` = MAX(`seq`, COALESCE((SELECT `seq` FROM `_ledger_seq`), 0))
WHERE `name` = 'ledger_entries';
--> statement-breakpoint

-- 5. Les index, à l'identique (0023, 0026, 0027, 0038).
CREATE UNIQUE INDEX `internal_transfer_leg_idx` ON `ledger_entries` (`transfer_id`,`transfer_leg`);
--> statement-breakpoint
CREATE INDEX `ledger_entries_season_idx` ON `ledger_entries` (`season_id`);
--> statement-breakpoint
CREATE INDEX `ledger_entries_date_idx` ON `ledger_entries` (`date`);
--> statement-breakpoint
CREATE INDEX `ledger_entries_account_date_idx` ON `ledger_entries` (`account_id`, `date`);
--> statement-breakpoint
CREATE INDEX `ledger_entries_accrual_date_idx` ON `ledger_entries` (`accrual_type`, `date`);
--> statement-breakpoint
CREATE INDEX `ledger_entries_payment_method_idx` ON `ledger_entries` (`payment_method_id`);
--> statement-breakpoint

-- 6. Rétablissement du lien des chèques, et ménage.
UPDATE `checks` SET `ledger_entry_id` = (SELECT l.`ledger_entry_id` FROM `_checks_ledger_link` l WHERE l.`check_id` = `checks`.`id`)
WHERE `id` IN (SELECT `check_id` FROM `_checks_ledger_link`);
--> statement-breakpoint
DROP TABLE `_checks_ledger_link`;
--> statement-breakpoint
DROP TABLE `_ledger_seq`;
