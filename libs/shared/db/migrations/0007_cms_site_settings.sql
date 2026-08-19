-- Réglages du pied de page du site public.
--
-- Ces quatre valeurs étaient écrites en dur dans `SiteFooter.astro` : la phrase sous le
-- nom du club, l'adresse, et les deux comptes sociaux. Rien n'y justifiait un
-- déploiement — ce sont des données de club, qui changent quand le bureau change, pas
-- quand le code change.
--
-- Ligne unique `id = 1`, semée ici avec les valeurs qui étaient en dur : la migration
-- ne doit rien retirer de ce que le site affiche déjà.
--
-- L'emplacement de menu `legal` (barre basse : mentions légales, confidentialité)
-- n'apparaît pas ici : `cms_nav_items.location` est un `text` sans contrainte, et
-- l'énumération vit dans le schéma Drizzle, en TypeScript.
CREATE TABLE `cms_site_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`footer_description` text DEFAULT '' NOT NULL,
	`footer_address` text DEFAULT '' NOT NULL,
	`instagram_url` text,
	`facebook_url` text,
	`updated_by_email` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);--> statement-breakpoint
INSERT OR IGNORE INTO `cms_site_settings` (`id`, `footer_description`, `footer_address`, `instagram_url`, `facebook_url`, `updated_by_email`, `updated_at`) VALUES (1, 'Plus qu''une Tribu !', 'Place de la Mairie, 91620 Nozay', 'https://www.instagram.com/nozaybad/', 'https://www.facebook.com/nozaybad/', '', CAST(strftime('%s','now') AS INTEGER));
