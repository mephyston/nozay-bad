-- Le compte d'attente des adhérents, et le porte-monnaie Badnet rangé parmi les disponibilités.
--
-- Une adhérente vire une somme sur le compte courant du club, puis le club crédite la même
-- somme sur son porte-monnaie Badnet personnel. Entre les deux gestes, le club lui doit cet
-- argent. Ce n'est ni une recette ni une dépense : c'est une opération pour compte de tiers,
-- qui ne doit jamais toucher au résultat. En comptabilité de trésorerie, on la porte sur un
-- compte d'attente nominatif, soldé ou justifié nom par nom à la clôture, et présenté comme
-- une dette et non comme de la trésorerie.
--
-- D'où le compte « Fonds reçus pour le compte des adhérents », en classe 467 du plan comptable
-- associatif. Il est typé trésorerie parce que c'est le seul type qui permette d'y faire des
-- virements. La classe 4 dit sa nature : le code le lit pour l'écarter des totaux de trésorerie
-- disponible et pour afficher son solde, normalement nul ou négatif, comme une somme due.
--
-- Le porte-monnaie Badnet, lui, avait été rattaché à la classe 4091 (avance chez un fournisseur)
-- par la migration 0030. Or l'argent en est retirable vers la banque à tout moment : c'est une
-- caisse dématérialisée, un compte de disponibilités. Il rejoint la classe 517 du seed, celle du
-- Livret A. La classe 4091 ne sert plus et disparaît, sauf si quelque chose la référence encore.
UPDATE `accounts` SET `account_class_id` = (SELECT `id` FROM `account_classes` WHERE `code` = '517') WHERE `code` = 'badnet';
--> statement-breakpoint
INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('467', 'Autres comptes débiteurs ou créditeurs', 'tresorerie', 1788739200);
--> statement-breakpoint
INSERT OR IGNORE INTO `accounts` (`code`, `label`, `account_class_id`, `created_at`) VALUES
('member_advances', 'Fonds reçus pour le compte des adhérents', (SELECT `id` FROM `account_classes` WHERE `code` = '467'), 1788739200);
--> statement-breakpoint
DELETE FROM `account_classes` WHERE `code` = '4091'
  AND `id` NOT IN (SELECT `account_class_id` FROM `accounts`)
  AND `id` NOT IN (SELECT `receipt_account_class_id` FROM `categories` WHERE `receipt_account_class_id` IS NOT NULL)
  AND `id` NOT IN (SELECT `expense_account_class_id` FROM `categories` WHERE `expense_account_class_id` IS NOT NULL);
