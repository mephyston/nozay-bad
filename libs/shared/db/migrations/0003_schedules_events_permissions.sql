-- Droits des rubriques « Créneaux » et « Agenda ».
--
-- Ces deux domaines sont distincts du site public : ils portent des données du club
-- que le site se contente d'afficher. L'entraîneur tient les créneaux à jour sans
-- avoir la main sur les pages ; la communication tient l'agenda.
--
-- Bloc généré depuis ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts) :
-- `libs/migrations.test.ts` rejoue les migrations et compare au code, le fichier ne
-- peut donc pas en diverger. `super_admin` reste absent, il vaut tout le catalogue.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'events:events:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'events:events:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'events:events:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'schedules:slots:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'schedules:slots:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'events:events:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'schedules:slots:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('secretaire', 'events:events:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'events:events:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'schedules:slots:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'events:events:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'schedules:slots:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'schedules:slots:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('communication', 'events:events:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'events:events:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'events:events:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'schedules:slots:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'schedules:slots:write', CAST(strftime('%s','now') AS INTEGER));
