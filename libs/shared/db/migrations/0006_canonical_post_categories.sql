-- Taxonomie canonique des actualités.
--
-- Les catégories reprises de WordPress avaient doublonné avec celles créées en 0005 :
-- « Jeunes » et « Actions jeunes » désignaient la même chose, « Animation » et
-- « Événements » aussi. On retient six rubriques, et six seulement.
--
-- Deux d'entre elles changent d'identifiant pour passer au singulier — `tournoi` et
-- `interclub` — ce qui impose de re-rattacher leurs articles avant de retirer les
-- anciennes. C'est le seul travail réel de cette migration : une catégorie supprimée
-- emporte ses rattachements, et un article qui perd le sien ne le retrouve pas.
--
-- Les liens sont retirés **explicitement** et non laissés à la cascade : `ON DELETE
-- CASCADE` suppose `PRAGMA foreign_keys = ON`, vrai sur D1 mais pas garanti sur tout
-- moteur qui rejouerait ce fichier. Un lien orphelin pointerait alors une catégorie
-- disparue.

-- 1. Les six rubriques, créées si elles manquent.
--
--    Les six, et pas seulement les nouvelles : `divers` et `information-generale`
--    n'existaient que par l'import WordPress, qui est un fichier de données appliqué à
--    la main sur deux environnements. Un environnement neuf, monté depuis les seules
--    migrations, se serait retrouvé avec quatre rubriques sur six — écart invisible
--    jusqu'au jour où quelqu'un cherche « Divers » dans le formulaire.
--
--    `INSERT OR IGNORE` : là où elles existent déjà, la ligne est conservée avec ses
--    rattachements, et l'étape 3 se charge du libellé.
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('actions-jeunes', 'Actions jeunes', 0, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('animation', 'Animation', 1, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('tournoi', 'Tournoi', 2, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('interclub', 'Interclub', 3, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('information-generale', 'Informations générales', 4, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('divers', 'Divers', 5, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint

-- 2. Re-rattachement des articles, avant toute suppression.
--    `INSERT OR IGNORE` : un article déjà classé dans les deux ne produit pas de doublon.
INSERT OR IGNORE INTO `cms_post_category_links` (`post_id`, `category_id`) SELECT `l`.`post_id`, (SELECT `id` FROM `cms_post_categories` WHERE `slug` = 'actions-jeunes') FROM `cms_post_category_links` `l` JOIN `cms_post_categories` `c` ON `c`.`id` = `l`.`category_id` WHERE `c`.`slug` = 'jeunes';--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_category_links` (`post_id`, `category_id`) SELECT `l`.`post_id`, (SELECT `id` FROM `cms_post_categories` WHERE `slug` = 'animation') FROM `cms_post_category_links` `l` JOIN `cms_post_categories` `c` ON `c`.`id` = `l`.`category_id` WHERE `c`.`slug` = 'evenements';--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_category_links` (`post_id`, `category_id`) SELECT `l`.`post_id`, (SELECT `id` FROM `cms_post_categories` WHERE `slug` = 'tournoi') FROM `cms_post_category_links` `l` JOIN `cms_post_categories` `c` ON `c`.`id` = `l`.`category_id` WHERE `c`.`slug` = 'tournois';--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_category_links` (`post_id`, `category_id`) SELECT `l`.`post_id`, (SELECT `id` FROM `cms_post_categories` WHERE `slug` = 'interclub') FROM `cms_post_category_links` `l` JOIN `cms_post_categories` `c` ON `c`.`id` = `l`.`category_id` WHERE `c`.`slug` = 'interclubs';--> statement-breakpoint

-- 3. Libellés et ordre d'affichage canoniques.
UPDATE `cms_post_categories` SET `name` = 'Actions jeunes', `nav_order` = 0 WHERE `slug` = 'actions-jeunes';--> statement-breakpoint
UPDATE `cms_post_categories` SET `name` = 'Animation', `nav_order` = 1 WHERE `slug` = 'animation';--> statement-breakpoint
UPDATE `cms_post_categories` SET `name` = 'Informations générales', `nav_order` = 4 WHERE `slug` = 'information-generale';--> statement-breakpoint
UPDATE `cms_post_categories` SET `name` = 'Divers', `nav_order` = 5 WHERE `slug` = 'divers';--> statement-breakpoint

-- 4. Retrait des rubriques abandonnées.
--    `adultes` et `resultats` n'ont pas de remplaçante : leurs articles perdent leur
--    étiquette et restent lisibles, classés dans « Animations » côté adhérents — le
--    partage y étant exhaustif, une actualité sans catégorie n'y devient pas orpheline.
DELETE FROM `cms_post_category_links` WHERE `category_id` IN (SELECT `id` FROM `cms_post_categories` WHERE `slug` IN ('jeunes', 'evenements', 'tournois', 'interclubs', 'adultes', 'resultats'));--> statement-breakpoint
DELETE FROM `cms_post_categories` WHERE `slug` IN ('jeunes', 'evenements', 'tournois', 'interclubs', 'adultes', 'resultats');
