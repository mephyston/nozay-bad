-- Le porte-monnaie Badnet, quatrième compte de trésorerie du club.
--
-- Le club détient un avoir prépayé chez Badnet, la plateforme d'inscription aux tournois.
-- Il s'en sert pour créditer le porte-monnaie personnel d'une adhérente qui a viré la même
-- somme sur le compte courant, pour payer les inscriptions de ses équipes, et il y encaisse
-- les inscriptions des participants à ses propres tournois avant de les rapatrier en banque.
--
-- Tant que ce compte n'existait pas, l'argent déposé chez Badnet sortait des livres : la
-- recharge était saisie en dépense, et le virement d'une adhérente aurait été saisi en
-- recette alors que le club ne gagne rien. Le compte de résultat était faux du montant du
-- porte-monnaie. Avec ce compte, ces mouvements deviennent des virements internes, hors
-- résultat, et seules les inscriptions encaissées ou payées pèsent sur l'exercice.
--
-- La classe est le 4091 du plan comptable associatif, avances et acomptes versés à un
-- fournisseur. Elle est typée trésorerie parce que c'est le seul type qui permette d'y
-- faire des virements et qui la fasse entrer dans le bilan de trésorerie. Ce compte n'a
-- pas de relevé : il se contrôle à la main contre l'écran Badnet du club.
--
-- Rejouable grâce aux contraintes d'unicité sur les codes, comme le seed d'origine.
INSERT OR IGNORE INTO `account_classes` (`code`, `label`, `type`, `created_at`) VALUES
('4091', 'Fournisseurs, avances et acomptes versés', 'tresorerie', 1788652800);
--> statement-breakpoint
INSERT OR IGNORE INTO `accounts` (`code`, `label`, `account_class_id`, `created_at`) VALUES
('badnet', 'Porte-monnaie Badnet', (SELECT `id` FROM `account_classes` WHERE `code` = '4091'), 1788652800);
