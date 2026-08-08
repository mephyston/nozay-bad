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
-- Droits de la rubrique « Annonces », repris de ROLE_PERMISSIONS
-- (libs/domains/iam/shared/roles.ts) au moment de cette migration. Bloc généré depuis
-- le code afin qu'il ne puisse pas en diverger : `libs/migrations.test.ts` rejoue 0013
-- puis cette migration et compare le résultat à la définition d'origine.
--
-- `super_admin` reste absent : il vaut toujours la totalité du catalogue, calculée en
-- code. C'est précisément ce qui lui donne ces nouveaux droits sans migration.
--
-- `INSERT OR IGNORE` : un rôle dont l'administration aurait déjà accordé le droit à la
-- main ne doit pas faire échouer la reprise (index unique sur (role, permission)).
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('secretaire', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER));
