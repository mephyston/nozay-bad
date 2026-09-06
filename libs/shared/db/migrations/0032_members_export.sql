-- Exporter les adresses mail des adhérents.
--
-- La liste des adhérents propose un fichier CSV des adresses aux filtres en cours.
-- Une liste d'adresses est une donnée personnelle qui sort de l'application : le
-- droit est distinct de la simple consultation (`members:members:read`), comme
-- `accounting:reports:export` l'est de la lecture des rapports. Il va à qui tient le
-- fichier des adhérents — le secrétariat — et à la présidence, qui peut tout lire.
--
-- `super_admin` est volontairement absent : il vaut la totalité du catalogue, calculée
-- en code.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'members:members:export', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'members:members:export', CAST(strftime('%s','now') AS INTEGER));
