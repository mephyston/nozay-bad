-- Encaissement d'espèces signé par les deux parties (RF-ACC-003).
--
-- Un reçu naît au gymnase, signé par celui qui encaisse et par le payeur. Il ne passe
-- aucune écriture : la recette naît à la remise au trésorier, qui compte l'enveloppe.
-- L'écart éventuel est rattaché à la remise, donc à la personne.
--
-- Migration additive. Un retour arrière ignore les deux tables et les droits ajoutés.
CREATE TABLE `cash_handovers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`collector_email` text NOT NULL,
	`treasurer_email` text NOT NULL,
	`expected_cents` integer NOT NULL,
	`counted_cents` integer NOT NULL,
	`gap_category_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text,
	`token_expires_at` integer,
	`signature_method` text,
	`signature_data` text,
	`signed_at` integer,
	`gap_ledger_entry_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gap_category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gap_ledger_entry_id`) REFERENCES `ledger_entries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `cash_handovers_counted_check` CHECK (`counted_cents` >= 0)
);
--> statement-breakpoint
CREATE INDEX `cash_handovers_collector_idx` ON `cash_handovers` (`collector_email`,`status`);
--> statement-breakpoint
CREATE TABLE `cash_receipts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`collector_email` text NOT NULL,
	`collector_name` text NOT NULL,
	`payer_member_id` integer,
	`payer_name` text NOT NULL,
	`payer_email` text,
	`amount_cents` integer NOT NULL,
	`category_id` integer NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_hash` text,
	`token_expires_at` integer,
	`code_hash` text,
	`code_expires_at` integer,
	`code_attempts` integer DEFAULT 0 NOT NULL,
	`signature_method` text,
	`signed_by` text,
	`signature_data` text,
	`signed_at` integer,
	`handover_id` integer,
	`ledger_entry_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`handover_id`) REFERENCES `cash_handovers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ledger_entry_id`) REFERENCES `ledger_entries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `cash_receipts_amount_check` CHECK (`amount_cents` > 0)
);
--> statement-breakpoint
CREATE INDEX `cash_receipts_collector_idx` ON `cash_receipts` (`collector_email`,`status`,`handover_id`);
--> statement-breakpoint
CREATE INDEX `cash_receipts_token_idx` ON `cash_receipts` (`token_hash`);
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'accounting:cash-receipts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:cash-receipts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:cash-handovers:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'accounting:cash-receipts:write', CAST(strftime('%s','now') AS INTEGER));
