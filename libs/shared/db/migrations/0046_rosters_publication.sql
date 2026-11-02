-- Publication des effectifs, par championnat et par saison.
--
-- Le coach compose ses équipes en début de saison par essais successifs. Jusqu'ici,
-- chaque essai enregistré se lisait aussitôt dans l'espace adhérent : un joueur voyait
-- son équipe changer trois fois dans la soirée. Tant que `rosters_published_at` est
-- vide, l'espace adhérent ne montre ni l'effectif ni le staff du championnat, et
-- personne n'y compose. L'administration, elle, voit tout.
--
-- Migration additive. Les championnats qui ont déjà des équipes sont repris comme
-- publiés, avec ou sans ligne de réglages : au déploiement, rien ne doit disparaître
-- de l'espace adhérent. Un retour arrière ignore simplement la colonne.
ALTER TABLE `championship_settings` ADD `rosters_published_at` integer;
--> statement-breakpoint
UPDATE `championship_settings`
SET `rosters_published_at` = CAST(strftime('%s','now') AS INTEGER)
WHERE EXISTS (
	SELECT 1 FROM `club_teams`
	WHERE `club_teams`.`season_code` = `championship_settings`.`season_code`
		AND `club_teams`.`championship` = `championship_settings`.`championship`
);
--> statement-breakpoint
INSERT OR IGNORE INTO `championship_settings` (`season_code`, `championship`, `rosters_published_at`, `updated_at`)
SELECT DISTINCT `season_code`, `championship`, CAST(strftime('%s','now') AS INTEGER), CAST(strftime('%s','now') AS INTEGER)
FROM `club_teams`;
