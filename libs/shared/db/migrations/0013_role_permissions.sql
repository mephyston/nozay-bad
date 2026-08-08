CREATE TABLE `role_permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role` text NOT NULL,
	`permission` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `role_permissions_role_permission_idx` ON `role_permissions` (`role`,`permission`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role`);--> statement-breakpoint
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
-- Valeurs de départ, reprises de ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts)
-- au moment de cette migration. Ce bloc a été généré depuis le code afin qu'il ne
-- puisse pas en diverger ; le code reste la définition d'origine, à laquelle l'écran
-- compare les rôles pour signaler ceux qui s'en écartent.
--
-- `super_admin` est volontairement absent : il vaut toujours la totalité du catalogue,
-- calculée en code. Figé ici, il n'obtiendrait pas les permissions ajoutées par les
-- fonctionnalités futures, et perdre son droit d'édition verrouillerait l'application.
--
-- Un INSERT par rôle plutôt qu'un SELECT composé : SQLite plafonne le nombre de
-- termes d'un UNION ALL, et la reprise le dépassait.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:ledger:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:invoices:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:bank:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:checks:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:budget:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:reports:export', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:seasons:close', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'accounting:budget:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'expenses:reports:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'shop:orders:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:users:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'iam:roles:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'ai:assistant:use', CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:ledger:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:invoices:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:bank:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:bank:import', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:bank:reconcile', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:checks:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:seasons:close', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:budget:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:budget:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:reports:export', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'accounting:config:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'members:attestations:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'expenses:reports:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'shop:orders:approve', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'ai:assistant:use', CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('secretaire', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:import', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:attestations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:attestations:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:products:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:categories:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'accounting:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'expenses:reports:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'accounting:seasons:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'accounting:config:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'members:members:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:products:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:products:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:categories:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:orders:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:orders:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'settings:hub:read', CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('membre', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('membre', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER));
