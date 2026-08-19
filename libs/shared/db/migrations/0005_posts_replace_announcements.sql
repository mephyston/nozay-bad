-- Les actualités absorbent les annonces.
--
-- Deux objets qui disaient presque la même chose — un titre, un texte riche, une date
-- de publication — se distinguaient par leur lecteur : les annonces pour l'espace
-- adhérent, les actualités pour le site public. Cette frontière devient un champ,
-- `visibility`, et il ne reste qu'un seul objet à rédiger, à catégoriser et à illustrer.
--
-- Les annonces ne sont pas reprises : leur table est supprimée avec le code qui la
-- servait (décision explicite). Ce qui est perdu est l'historique des annonces déjà
-- diffusées ; ce qui est gagné est un seul chemin de rédaction au lieu de deux.
--
-- `visibility` par défaut à 'public' : c'est le sens de la reprise WordPress, dont les
-- 99 articles étaient tous en ligne. L'inverse les aurait tous fait disparaître du site.
ALTER TABLE `cms_posts` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `cms_posts` ADD `notified_at` integer;--> statement-breakpoint
CREATE INDEX `cms_posts_visibility_status_published_idx` ON `cms_posts` (`visibility`,`status`,`published_at`);--> statement-breakpoint

-- Catégories de la nouvelle organisation, ajoutées à celles reprises de WordPress.
-- « Tournois » existe déjà (slug `tournois`) et n'est pas redoublée. `nav_order` prend
-- la suite des huit existantes.
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('actions-jeunes', 'Actions jeunes', 8, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint
INSERT OR IGNORE INTO `cms_post_categories` (`slug`, `name`, `nav_order`, `created_at`) VALUES ('evenements', 'Événements', 9, CAST(strftime('%s','now') AS INTEGER));--> statement-breakpoint

-- Droits des annonces retirés des rôles.
--
-- Obligatoire, et pas seulement pour la propreté : `libs/migrations.test.ts` compare
-- l'état semé à `ROLE_PERMISSIONS`. Les laisser en base ferait diverger les deux et
-- échouerait la suite au premier rejeu.
-- Rien n'est écrit dans `role_permission_log` : ce journal retrace les décisions d'un
-- administrateur, et `libs/migrations.test.ts` le veut vide sur une base neuve. Un
-- retrait imposé par le code n'est pas une décision d'exploitation.
DELETE FROM `role_permissions` WHERE `permission` LIKE 'announcements:%';--> statement-breakpoint

DROP TABLE IF EXISTS `announcements`;
