-- Encaisser une commande devient un droit à part, réservé à la trésorerie.
--
-- `shop:orders:approve` couvrait tout le parcours d'une commande, de la validation à la
-- remise, encaissement compris. Or l'encaissement écrit une recette au grand livre, et le
-- défaire la retire : c'est un acte comptable. Il passe sous `shop:payments:write`,
-- accordé au seul trésorier. La présidence garde la validation et la remise, mais
-- n'encaisse plus.
--
-- L'entraîneur reçoit `shop:orders:approve` : il valide, refuse ou annule une commande,
-- et remet l'article une fois que la trésorerie l'a encaissée.
--
-- Rien n'est retiré : le droit d'encaisser naît ici, et seuls les rôles listés le
-- reçoivent. `super_admin` est volontairement absent, il vaut la totalité du catalogue,
-- calculée en code.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('tresorier', 'shop:payments:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'shop:orders:approve', CAST(strftime('%s','now') AS INTEGER));
