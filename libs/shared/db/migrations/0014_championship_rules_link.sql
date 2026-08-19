-- Lien vers le règlement de la saison, par championnat.
--
-- Une URL, pas un fichier : le PDF est déposé dans la médiathèque du site, qui sait déjà
-- le stocker, le servir et le remplacer. Reconstruire un dépôt de fichiers ici
-- dupliquerait cette mécanique pour un seul document par championnat et par saison.
--
-- Le lien est publié aux capitaines et aux joueurs depuis la fiche d'équipe : c'est le
-- texte qu'ils doivent avoir sous la main le soir de la rencontre, et qu'aucun d'eux ne
-- retrouve seul sur le site du comité.

ALTER TABLE `championship_settings` ADD `rules_url` text;--> statement-breakpoint
ALTER TABLE `championship_settings` ADD `rules_label` text;
