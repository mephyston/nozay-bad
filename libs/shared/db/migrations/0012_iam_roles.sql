ALTER TABLE `admin_users` ADD `updated_at` integer;--> statement-breakpoint
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
-- Reprise de l'ancien tableau JSON `admin_users.permissions` vers des rôles.
--
-- Un rôle accorde nettement plus qu'une permission isolée : la correspondance ne
-- promeut donc que sur un droit d'écriture avéré. Un compte qui n'avait que
-- `accounting:reports` (lecture) devient `secretaire`, qui conserve la lecture des
-- rapports, et non `tresorier`, qui ouvrirait le grand livre en écriture.
--
-- Lancer l'audit ci-dessous après migration et ajuster à la main :
--   SELECT u.email, u.permissions, group_concat(r.role)
--   FROM admin_users u LEFT JOIN admin_user_roles r ON r.user_id = u.id GROUP BY u.id;
--
-- Note sur le motif `'%"*"%'` : il ne matche pas `"accounting:*"`, dont le caractère
-- précédant l'étoile est `:` et non un guillemet. Il n'attrape donc bien que le
-- joker global.
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`, `created_at`)
SELECT `id`, 'super_admin', CAST(strftime('%s','now') AS INTEGER)
FROM `admin_users`
WHERE `permissions` LIKE '%"*"%';--> statement-breakpoint
-- Trésorier : uniquement sur une écriture comptable ou une gestion de notes de frais.
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`, `created_at`)
SELECT `id`, 'tresorier', CAST(strftime('%s','now') AS INTEGER)
FROM `admin_users`
WHERE `permissions` NOT LIKE '%"*"%'
  AND (`permissions` LIKE '%"accounting:*"%'
       OR `permissions` LIKE '%"accounting:write"%'
       OR `permissions` LIKE '%"accounting:invoices"%'
       OR `permissions` LIKE '%"expenses:*"%'
       OR `permissions` LIKE '%"expenses:create"%'
       OR `permissions` LIKE '%"expenses:update"%'
       OR `permissions` LIKE '%"expenses:validate"%');--> statement-breakpoint
-- Secrétaire : adhérents, communication, boutique, et toute lecture comptable ou
-- note de frais qui ne justifie pas le rôle de trésorier.
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`, `created_at`)
SELECT `id`, 'secretaire', CAST(strftime('%s','now') AS INTEGER)
FROM `admin_users`
WHERE `permissions` NOT LIKE '%"*"%'
  AND (`permissions` LIKE '%"members:%' OR `permissions` LIKE '%"notifications:%'
       OR `permissions` LIKE '%"shop:%' OR `permissions` LIKE '%"orders:%'
       OR `permissions` LIKE '%"accounting:reports"%'
       OR `permissions` LIKE '%"expenses:read"%');--> statement-breakpoint
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`, `created_at`)
SELECT `id`, 'president', CAST(strftime('%s','now') AS INTEGER)
FROM `admin_users`
WHERE `permissions` NOT LIKE '%"*"%'
  AND `permissions` LIKE '%"iam:%';--> statement-breakpoint
-- Filet : aucun compte ne doit rester sans rôle, sinon il perd tout accès sans que
-- personne ne l'ait décidé. `membre` donne le tableau de bord et l'aide.
INSERT OR IGNORE INTO `admin_user_roles` (`user_id`, `role`, `created_at`)
SELECT u.`id`, 'membre', CAST(strftime('%s','now') AS INTEGER)
FROM `admin_users` u
WHERE NOT EXISTS (SELECT 1 FROM `admin_user_roles` r WHERE r.`user_id` = u.`id`);
