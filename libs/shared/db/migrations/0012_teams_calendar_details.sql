-- Trois précisions de calendrier, tirées du calendrier CD91 2026-2027.
--
-- **`team_fixtures.effective_week_start` — le report.**
-- Une rencontre peut être reportée à une semaine ultérieure (art. 4.2.3). La semaine de
-- la journée et celle du jeu cessent alors de coïncider, et chacune sert une règle
-- différente : la **hiérarchie des valeurs** compare les équipes du club **à journée
-- égale** — la J2 de l'équipe 2 contre la J2 de l'équipe 3, que le report les ait
-- séparées ou non — tandis que la règle **« un joueur, une seule équipe »** suit la
-- semaine réellement jouée, puisqu'elle porte sur une impossibilité physique.
-- Sans cette colonne, un report ferait disparaître une infraction de valeur, ou
-- interdirait à un joueur deux rencontres qu'il peut parfaitement disputer.
--
-- **`championship_days.match_date` — le jour de jeu.**
-- Les cinq journées vétérans tombent un **dimanche** précis, fixé par le comité. Le
-- mixte et le masculin, eux, laissent le club recevant choisir entre le samedi et le
-- dimanche de la semaine : la colonne y reste nulle, plutôt que d'inventer une date.
--
-- **`championship_days.kind` et `label` — les barrages.**
-- Les barrages et finales sont des journées que **toutes les équipes ne disputent pas**,
-- seules celles que leur classement y envoie. Les en distinguer évite de signaler comme
-- un oubli une équipe sans composition, alors que c'est le cas normal. Les règles de
-- valeur et d'alignement s'y appliquent à l'identique.

ALTER TABLE `championship_days` ADD `kind` text DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE `championship_days` ADD `label` text;--> statement-breakpoint
ALTER TABLE `championship_days` ADD `match_date` text;--> statement-breakpoint
ALTER TABLE `team_fixtures` ADD `effective_week_start` text;
