-- Rôle « Communication » : annonces et notifications, sans accès aux finances ni au
-- fichier des adhérents. Il permet de confier la communication du club à un bénévole
-- sans lui accorder le rôle `secretaire`, jusqu'ici seul autre porteur de ces droits.
--
-- Droits repris de ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts) au moment de
-- cette migration. Bloc généré depuis le code : `libs/migrations.test.ts` rejoue 0013
-- puis les migrations suivantes et compare le résultat à la définition d'origine.
--
-- Aucune donnée à reprendre : le rôle est nouveau, aucun compte ne le porte encore.
-- La liaison compte↔rôle s'attribue depuis l'écran « Accès & Rôles ».
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('communication', 'announcements:posts:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'announcements:posts:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'announcements:posts:write', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'dashboard:overview:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'help:docs:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'notifications:messages:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'notifications:messages:send', CAST(strftime('%s','now') AS INTEGER));
