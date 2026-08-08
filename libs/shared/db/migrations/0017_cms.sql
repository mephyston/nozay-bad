-- Tables du CMS du site public.
--
-- Toutes les tables du domaine arrivent en une fois, y compris celles dont la tranche
-- n'est pas encore écrite (actualités, médiathèque, menus). Deux raisons : `cms_pages`
-- référence `cms_media`, et découper en quatre migrations rendrait l'ordre de création
-- des clés étrangères inutilement délicat pour un gain nul — une table vide ne coûte
-- rien.
--
-- Écrite à la main : `drizzle-kit generate` ne peut pas produire ce fichier tant que
-- les instantanés de `meta/` n'auront pas été remis à niveau (ils décrivent encore un
-- schéma antérieur à 0003). Le fichier reproduit donc fidèlement ce que drizzle-kit
-- émettrait pour `libs/domains/cms/shared/schema.ts`, index et noms compris.

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
-- Unique sur le chemin, brouillons compris : un brouillon réserve son URL, sans quoi
-- la publication pourrait échouer sur un conflit découvert au dernier moment.
CREATE UNIQUE INDEX `cms_pages_path_idx` ON `cms_pages` (`path`);--> statement-breakpoint
CREATE INDEX `cms_pages_parent_nav_idx` ON `cms_pages` (`parent_id`,`nav_order`);--> statement-breakpoint

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

CREATE TABLE `cms_post_category_links` (
	`post_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `cms_posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `cms_post_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cms_post_category_links_pk` ON `cms_post_category_links` (`post_id`,`category_id`);--> statement-breakpoint
CREATE INDEX `cms_post_category_links_category_idx` ON `cms_post_category_links` (`category_id`);--> statement-breakpoint

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

CREATE TABLE `cms_content_version` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
-- Ligne unique. Elle entre dans la clé de cache du site public : publier l'incrémente,
-- ce qui rend d'un coup toutes les entrées précédentes inatteignables. C'est la seule
-- invalidation possible sans la purge par étiquette, réservée à l'offre Entreprise.
INSERT OR IGNORE INTO `cms_content_version` (`id`, `version`, `updated_at`)
  VALUES (1, 1, CAST(strftime('%s','now') AS INTEGER));
