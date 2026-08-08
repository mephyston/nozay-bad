-- Droits de la rubrique « Site public » (CMS du site vitrine).
--
-- Le CMS est distinct des annonces : une annonce s'adresse aux adhérents connectés,
-- une page du site s'adresse à tout le monde, Google compris. Publier engage l'image
-- publique du club, d'où un jeu de droits séparé plutôt qu'une extension des annonces.
--
-- Droits repris de ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts) au moment de
-- cette migration. Bloc généré depuis le code afin qu'il ne puisse pas en diverger :
-- `libs/migrations.test.ts` rejoue 0013 puis les migrations suivantes et compare le
-- résultat à la définition d'origine.
--
-- `super_admin` reste absent : il vaut toujours la totalité du catalogue, calculée en
-- code. C'est ce qui lui donne ces nouveaux droits sans migration.
--
-- Seul `communication` porte `cms:nav:write` en dehors de la présidence : modifier un
-- menu ou une redirection se paie en référencement, pas en contenu.
--
-- Aucune donnée à reprendre : les tables du CMS n'existent pas encore, elles arrivent
-- avec la tranche suivante. Ce sont les droits qui viennent en premier, pour que
-- l'écran « Accès & Rôles » soit prêt le jour où les pages apparaissent.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'cms:media:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:nav:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('secretaire', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER));
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('communication', 'cms:media:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:media:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:media:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:nav:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:nav:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:pages:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'cms:posts:write', CAST(strftime('%s','now') AS INTEGER));
