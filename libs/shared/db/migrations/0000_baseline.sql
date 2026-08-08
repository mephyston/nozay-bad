CREATE TABLE `account_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_classes_code_unique` ON `account_classes` (`code`);--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`account_class_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_class_id`) REFERENCES `account_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_code_unique` ON `accounts` (`code`);--> statement-breakpoint
CREATE TABLE `bank_statement_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fitid` text NOT NULL,
	`account_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	`memo` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`ai_suggestions` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_statement_lines_fitid_unique` ON `bank_statement_lines` (`fitid`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_label` text NOT NULL,
	`adherent_label` text NOT NULL,
	`hide_in_expenses` integer DEFAULT false NOT NULL,
	`receipt_account_class_id` integer,
	`expense_account_class_id` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`receipt_account_class_id`) REFERENCES `account_classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`expense_account_class_id`) REFERENCES `account_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_admin_label_unique` ON `categories` (`admin_label`);--> statement-breakpoint
CREATE TABLE `check_deposits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`reference` text NOT NULL,
	`date` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`bank_statement_line_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_statement_line_id`) REFERENCES `bank_statement_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_deposits_reference_unique` ON `check_deposits` (`reference`);--> statement-breakpoint
CREATE TABLE `checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`check_deposit_id` integer,
	`season_id` integer NOT NULL,
	`number` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`emitter` text NOT NULL,
	`bank` text,
	`member_id` integer,
	`ledger_entry_id` integer,
	`status` text DEFAULT 'received' NOT NULL,
	`photo_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`check_deposit_id`) REFERENCES `check_deposits`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ledger_entry_id`) REFERENCES `ledger_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`total_price_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`season_id` integer NOT NULL,
	`date` text NOT NULL,
	`due_date` text NOT NULL,
	`client_name` text NOT NULL,
	`client_address` text,
	`client_email` text,
	`subject` text,
	`location` text,
	`period` text,
	`attendees` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_amount_cents` integer NOT NULL,
	`bank_statement_line_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_statement_line_id`) REFERENCES `bank_statement_lines`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`type` text NOT NULL,
	`account_id` integer NOT NULL,
	`destination_account_id` integer,
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
	FOREIGN KEY (`destination_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_statement_line_id`) REFERENCES `bank_statement_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ledger_entries_amount_cents_check" CHECK("ledger_entries"."amount_cents" > 0),
	CONSTRAINT "ledger_entries_transfert_check" CHECK(("ledger_entries"."type" = 'transfert' AND "ledger_entries"."destination_account_id" IS NOT NULL AND "ledger_entries"."destination_account_id" <> "ledger_entries"."account_id" AND "ledger_entries"."category_id" IS NULL) OR ("ledger_entries"."type" <> 'transfert' AND "ledger_entries"."destination_account_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL,
	`default_account_id` integer NOT NULL,
	`default_entry_status` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`default_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_methods_code_unique` ON `payment_methods` (`code`);--> statement-breakpoint
CREATE TABLE `season_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`initial_balance_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `season_account_idx` ON `season_balances` (`season_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `season_category_budgets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `season_category_idx` ON `season_category_budgets` (`season_id`,`category_id`,`type`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`closed_at` integer,
	`approved_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_code_unique` ON `seasons` (`code`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body_html` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`notified_at` integer,
	`author_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `announcements_status_published_at_idx` ON `announcements` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `cms_content_version` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`alt` text DEFAULT '' NOT NULL,
	`title` text,
	`credit` text,
	`content_hash` text NOT NULL,
	`legacy_wp_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_media_key_unique` ON `cms_media` (`key`);--> statement-breakpoint
CREATE INDEX `cms_media_content_hash_idx` ON `cms_media` (`content_hash`);--> statement-breakpoint
CREATE TABLE `cms_media_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`media_id` integer NOT NULL,
	`format` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`size_bytes` integer NOT NULL,
	`key` text NOT NULL,
	FOREIGN KEY (`media_id`) REFERENCES `cms_media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_media_variants_key_unique` ON `cms_media_variants` (`key`);--> statement-breakpoint
CREATE INDEX `cms_media_variants_media_idx` ON `cms_media_variants` (`media_id`,`format`,`width`);--> statement-breakpoint
CREATE TABLE `cms_nav_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location` text NOT NULL,
	`parent_id` integer,
	`label` text NOT NULL,
	`page_id` integer,
	`external_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `cms_nav_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`page_id`) REFERENCES `cms_pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cms_nav_items_location_idx` ON `cms_nav_items` (`location`,`parent_id`,`position`);--> statement-breakpoint
CREATE TABLE `cms_page_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`position` integer NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `cms_pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_page_blocks_page_position_idx` ON `cms_page_blocks` (`page_id`,`position`);--> statement-breakpoint
CREATE TABLE `cms_page_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`page_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`author_email` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `cms_pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_page_revisions_page_revision_idx` ON `cms_page_revisions` (`page_id`,`revision`);--> statement-breakpoint
CREATE INDEX `cms_page_revisions_page_created_idx` ON `cms_page_revisions` (`page_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cms_pages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`path` text NOT NULL,
	`parent_id` integer,
	`title` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`template` text DEFAULT 'default' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`og_image_media_id` integer,
	`noindex` integer DEFAULT false NOT NULL,
	`nav_order` integer DEFAULT 0 NOT NULL,
	`published_at` integer,
	`updated_by_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `cms_pages`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`og_image_media_id`) REFERENCES `cms_media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_pages_path_idx` ON `cms_pages` (`path`);--> statement-breakpoint
CREATE INDEX `cms_pages_parent_nav_idx` ON `cms_pages` (`parent_id`,`nav_order`);--> statement-breakpoint
CREATE TABLE `cms_post_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`nav_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_post_categories_slug_unique` ON `cms_post_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `cms_post_category_links` (
	`post_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `cms_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `cms_post_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_post_category_links_pk` ON `cms_post_category_links` (`post_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `cms_post_category_links_category_idx` ON `cms_post_category_links` (`category_id`);--> statement-breakpoint
CREATE TABLE `cms_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`path` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`body_html` text NOT NULL,
	`cover_media_id` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`seo_title` text,
	`seo_description` text,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`published_at` integer,
	`legacy_wp_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cover_media_id`) REFERENCES `cms_media`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_posts_path_idx` ON `cms_posts` (`path`);--> statement-breakpoint
CREATE INDEX `cms_posts_status_published_idx` ON `cms_posts` (`status`,`published_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `cms_posts_legacy_wp_id_idx` ON `cms_posts` (`legacy_wp_id`);--> statement-breakpoint
CREATE TABLE `cms_redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_path` text NOT NULL,
	`to_path` text,
	`status_code` integer DEFAULT 301 NOT NULL,
	`hit_count` integer DEFAULT 0 NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_redirects_from_path_unique` ON `cms_redirects` (`from_path`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`description` text NOT NULL,
	`category_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`photo_url` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`emitter_name` text NOT NULL,
	`member_id` integer,
	`ledger_entry_id` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT "expenses_amount_cents_check" CHECK("expenses"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE `admin_user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `admin_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_user_roles_user_role_idx` ON `admin_user_roles` (`user_id`,`role`);--> statement-breakpoint
CREATE INDEX `admin_user_roles_role_idx` ON `admin_user_roles` (`role`);--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`permissions` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_email_unique` ON `admin_users` (`email`);--> statement-breakpoint
CREATE TABLE `role_permission_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`permission` text NOT NULL,
	`action` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `role_permission_log_role_idx` ON `role_permission_log` (`role`);--> statement-breakpoint
CREATE INDEX `role_permission_log_created_at_idx` ON `role_permission_log` (`created_at`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_role_permission_idx` ON `role_permissions` (`role`,`permission`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role`);--> statement-breakpoint
CREATE TABLE `attestation_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`signatory_name` text DEFAULT 'Robert THAI' NOT NULL,
	`signatory_email` text DEFAULT 'president@nozaybad.fr' NOT NULL,
	`website_url` text DEFAULT 'www.nozaybad.fr' NOT NULL,
	`signature_base64` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`season_id` integer NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text NOT NULL,
	`email` text,
	`phone` text,
	`status` text DEFAULT 'valide' NOT NULL,
	`type` text NOT NULL,
	`imported_at` integer NOT NULL,
	`amount_due_cents` integer DEFAULT 0 NOT NULL,
	`amount_received_cents` integer DEFAULT 0 NOT NULL,
	`amount_remaining_cents` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`expense_authorized` integer DEFAULT false NOT NULL,
	`parent1_name` text,
	`parent1_email` text,
	`parent1_phone` text,
	`parent2_name` text,
	`parent2_email` text,
	`parent2_phone` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_licence_season_idx` ON `members` (`licence`,`season_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `push_deliveries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`subscription_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `push_deliveries_status_idx` ON `push_deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `push_deliveries_message_idx` ON `push_deliveries` (`message_id`);--> statement-breakpoint
CREATE TABLE `push_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`url` text,
	`target` text DEFAULT 'all' NOT NULL,
	`target_detail` text,
	`source` text DEFAULT 'admin' NOT NULL,
	`category` text DEFAULT 'announcement' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `push_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`category` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_preferences_email_category_idx` ON `push_preferences` (`email`,`category`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_success_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_email_idx` ON `push_subscriptions` (`email`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_amount_cents` integer NOT NULL,
	`payment_method_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_at` text,
	`ledger_entry_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`accounting_category_id` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_categories_label_unique` ON `product_categories` (`label`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product_category_id` integer NOT NULL,
	`price_cents` integer NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`track_stock` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_category_id`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE no action
);
