-- Le président peut désigner le bureau.
--
-- La page Dirigeants et l'éditeur de fonction au club de la fiche adhérent sont
-- gouvernés par `members:members:write`, faute d'une permission dédiée. Ce droit
-- n'appartenait qu'au secrétariat : la présidence pouvait consulter les fonctions au
-- club sans pouvoir en attribuer aucune, alors que nommer un président ou un trésorier
-- est précisément une décision d'assemblée générale.
--
-- Contrepartie assumée : le droit ouvre aussi l'édition d'une fiche adhérent et
-- l'autorisation de note de frais. Séparer les deux demanderait une permission
-- `members:functions:write` distincte — chantier volontairement remis à plus tard.
--
-- `super_admin` est volontairement absent : il vaut la totalité du catalogue, calculée
-- en code. Figé en base, il n'obtiendrait pas les permissions des fonctionnalités à venir.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'members:members:write', CAST(strftime('%s','now') AS INTEGER));
