-- Caisse et carte buvette.
--
-- Le solde d'une carte est de l'argent dû au client : un compte de tiers de classe 4, hors
-- des totaux de trésorerie, comme le compte d'attente des adhérents (0031). Une recharge y
-- entre par virement, et la recette naît à la consommation.
--
-- Migration additive. Un retour arrière ignore simplement les tables.
CREATE TABLE `buvette_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer NOT NULL,
	`accounting_category_id` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `buvette_items_price_check` CHECK (`price_cents` >= 0)
);
--> statement-breakpoint
CREATE TABLE `buvette_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`max_balance_cents` integer DEFAULT 10000 NOT NULL,
	`cash_payment_method_id` integer,
	`prepaid_payment_method_id` integer,
	`card_payment_method_id` integer,
	`gap_category_id` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `buvette_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'account' NOT NULL,
	`email` text,
	`paper_code_hash` text,
	`face_value_cents` integer,
	`paper_status` text,
	`paper_closed_reason` text,
	`balance_cents` integer DEFAULT 0 NOT NULL,
	`reserved_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`terms_version` text,
	`terms_accepted_at` integer,
	`deleted_at` integer,
	CONSTRAINT `buvette_cards_balance_check` CHECK (`balance_cents` >= 0),
	CONSTRAINT `buvette_cards_reserved_check` CHECK (`reserved_cents` >= 0 AND `reserved_cents` <= `balance_cents`),
	CONSTRAINT `buvette_cards_paper_check` CHECK (`kind` <> 'paper' OR `balance_cents` <= `face_value_cents`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_cards_email_unique` ON `buvette_cards` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_cards_paper_code_hash_unique` ON `buvette_cards` (`paper_code_hash`);
--> statement-breakpoint
CREATE TABLE `buvette_card_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`card_id`) REFERENCES `buvette_cards`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `buvette_card_devices_card_idx` ON `buvette_card_devices` (`card_id`);
--> statement-breakpoint
CREATE TABLE `buvette_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`business_date` text NOT NULL,
	`opening_float_cents` integer NOT NULL,
	`opened_by_email` text NOT NULL,
	`opened_at` integer NOT NULL,
	CONSTRAINT `buvette_sessions_float_check` CHECK (`opening_float_cents` >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_sessions_one_open_idx` ON `buvette_sessions` (`status`) WHERE `status` = 'open';
--> statement-breakpoint
CREATE TABLE `buvette_session_closures` (
	`session_id` integer PRIMARY KEY NOT NULL,
	`expected_cash_cents` integer NOT NULL,
	`counted_cash_cents` integer NOT NULL,
	`gap_cents` integer NOT NULL,
	`closed_by_email` text NOT NULL,
	`closed_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `buvette_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `buvette_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`session_id` integer NOT NULL,
	`number` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `buvette_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `buvette_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_orders_one_pending_idx` ON `buvette_orders` (`card_id`) WHERE `status` = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_orders_session_number_idx` ON `buvette_orders` (`session_id`, `number`);
--> statement-breakpoint
CREATE INDEX `buvette_orders_status_idx` ON `buvette_orders` (`status`);
--> statement-breakpoint
CREATE TABLE `buvette_order_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `buvette_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `buvette_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `buvette_order_lines_quantity_check` CHECK (`quantity` > 0)
);
--> statement-breakpoint
CREATE INDEX `buvette_order_lines_order_idx` ON `buvette_order_lines` (`order_id`);
--> statement-breakpoint
CREATE TABLE `buvette_sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`session_id` integer NOT NULL,
	`order_id` integer,
	`status` text DEFAULT 'paid' NOT NULL,
	`items_cents` integer NOT NULL,
	`recharge_cents` integer DEFAULT 0 NOT NULL,
	`recharge_card_id` integer,
	`prepaid_cents` integer DEFAULT 0 NOT NULL,
	`prepaid_card_id` integer,
	`cash_cents` integer DEFAULT 0 NOT NULL,
	`card_cents` integer DEFAULT 0 NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`cancelled_by_email` text,
	`cancelled_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `buvette_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `buvette_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recharge_card_id`) REFERENCES `buvette_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prepaid_card_id`) REFERENCES `buvette_cards`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `buvette_sales_amounts_check` CHECK (`items_cents` >= 0 AND `recharge_cents` >= 0 AND `prepaid_cents` >= 0 AND `cash_cents` >= 0 AND `card_cents` >= 0),
	CONSTRAINT `buvette_sales_total_check` CHECK (`prepaid_cents` + `cash_cents` + `card_cents` = `items_cents` + `recharge_cents` AND `prepaid_cents` <= `items_cents`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_sales_client_id_unique` ON `buvette_sales` (`client_id`);
--> statement-breakpoint
CREATE INDEX `buvette_sales_session_idx` ON `buvette_sales` (`session_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_sales_one_per_order_idx` ON `buvette_sales` (`order_id`) WHERE `order_id` IS NOT NULL AND `status` <> 'cancelled';
--> statement-breakpoint
CREATE TABLE `buvette_sale_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`name` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`quantity` integer NOT NULL,
	`accounting_category_id` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `buvette_sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `buvette_items`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `buvette_sale_lines_quantity_check` CHECK (`quantity` > 0)
);
--> statement-breakpoint
CREATE INDEX `buvette_sale_lines_sale_idx` ON `buvette_sale_lines` (`sale_id`);
--> statement-breakpoint
CREATE TABLE `buvette_card_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`foreign_tx_id` text NOT NULL,
	`sale_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`transaction_code` text,
	`anomaly` text,
	`created_at` integer NOT NULL,
	`checked_at` integer,
	FOREIGN KEY (`sale_id`) REFERENCES `buvette_sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_card_attempts_foreign_tx_id_unique` ON `buvette_card_attempts` (`foreign_tx_id`);
--> statement-breakpoint
CREATE INDEX `buvette_card_attempts_sale_idx` ON `buvette_card_attempts` (`sale_id`);
--> statement-breakpoint
CREATE INDEX `buvette_card_attempts_status_idx` ON `buvette_card_attempts` (`status`);
--> statement-breakpoint
CREATE TABLE `buvette_card_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`card_id` integer NOT NULL,
	`session_id` integer,
	`sale_id` integer,
	`type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `buvette_cards`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `buvette_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `buvette_sales`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT `buvette_card_movements_session_check` CHECK (`type` = 'transfer' OR `session_id` IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_card_movements_client_id_unique` ON `buvette_card_movements` (`client_id`);
--> statement-breakpoint
CREATE INDEX `buvette_card_movements_card_idx` ON `buvette_card_movements` (`card_id`);
--> statement-breakpoint
CREATE INDEX `buvette_card_movements_session_idx` ON `buvette_card_movements` (`session_id`);
--> statement-breakpoint
CREATE TABLE `buvette_sumup_refunds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attempt_id` integer NOT NULL,
	`status` text NOT NULL,
	`amount_cents` integer,
	`error` text,
	`requested_by_email` text NOT NULL,
	`requested_at` integer NOT NULL,
	`done_at` integer,
	FOREIGN KEY (`attempt_id`) REFERENCES `buvette_card_attempts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buvette_sumup_refunds_attempt_id_unique` ON `buvette_sumup_refunds` (`attempt_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('419', 'Clients, avances reçues', 'tresorerie', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('5115', 'Cartes bancaires à l''encaissement', 'tresorerie', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `accounts` (`code`, `label`, `account_class_id`, `kind`, `created_at`) VALUES
('buvette_cards', 'Soldes des cartes buvette', (SELECT `id` FROM `account_classes` WHERE `code` = '419'), 'third_party', CAST(strftime('%s','now') AS INTEGER)),
('sumup', 'À recevoir de SumUp', (SELECT `id` FROM `account_classes` WHERE `code` = '5115'), 'voucher', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `payment_methods` (`code`, `label`, `default_account_id`, `default_entry_status`, `kind`, `storefront`, `created_at`) VALUES
('carte_buvette', 'Carte buvette', (SELECT `id` FROM `accounts` WHERE `code` = 'buvette_cards'), 'cleared', 'voucher', 0, CAST(strftime('%s','now') AS INTEGER)),
('sumup', 'CB SumUp (buvette)', (SELECT `id` FROM `accounts` WHERE `code` = 'sumup'), 'cleared', 'card', 0, CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `categories` (`admin_label`, `adherent_label`, `hide_in_expenses`, `active`, `created_at`) VALUES
('Écarts de caisse', 'Écarts de caisse', 1, 1, CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `buvette_settings` (`id`, `max_balance_cents`, `cash_payment_method_id`, `prepaid_payment_method_id`, `card_payment_method_id`, `gap_category_id`, `updated_at`) VALUES
(1, 10000, (SELECT `id` FROM `payment_methods` WHERE `code` = 'especes'), (SELECT `id` FROM `payment_methods` WHERE `code` = 'carte_buvette'), (SELECT `id` FROM `payment_methods` WHERE `code` = 'sumup'), (SELECT `id` FROM `categories` WHERE `admin_label` = 'Écarts de caisse'), CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'buvette:items:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'buvette:settings:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'buvette:sessions:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:items:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:items:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:settings:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:settings:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:sessions:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:sessions:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:sessions:close', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:sales:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:cards:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'buvette:cards:write', CAST(strftime('%s','now') AS INTEGER));
