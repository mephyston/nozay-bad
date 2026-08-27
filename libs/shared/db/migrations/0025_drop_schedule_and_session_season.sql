-- Un créneau n'appartient plus à une saison.
--
-- `schedule_slots.season_code` était `NOT NULL` mais n'a jamais été saisi : l'écran d'admin le
-- déduisait de la date du jour (`schedules.astro`), sans l'afficher, sans le proposer à
-- l'édition et sans jamais filtrer dessus. Il ne datait donc pas le créneau, il datait sa
-- **création**. Une grille tenue sur deux étés — les mêmes horaires, complétés d'une année sur
-- l'autre — s'y retrouvait scindée en `25-26` et `26-27` sans que rien ne le laisse voir, ni en
-- admin ni sur le site.
--
-- Or un créneau du club vaut d'une saison à l'autre : c'est un accord avec la mairie sur un
-- gymnase, pas une inscription. Ce qui disparaît d'une année sur l'autre se retire avec
-- `active`, colonne qui existe déjà et qui, elle, est visible.
--
-- `open_play_sessions.season_code` part pour la raison inverse mais avec la même conclusion :
-- une séance **est une date**. « Le samedi 14 mars 2026 » dit déjà de quelle saison elle
-- relève ; la colonne ne faisait que recopier une déduction, et pouvait la contredire. La
-- saison d'une séance se lit désormais de sa date (`shared/season.ts`).
--
-- `open_play_openers.season_code` **reste** : les détenteurs de clé changent d'une année sur
-- l'autre, c'est le seul vrai fait de saison de ce domaine.
--
-- Migration **destructive** : les colonnes partent avec leurs valeurs. Rien ne les lisait
-- d'irremplaçable — le filtre `?season=` de `/schedules` et de `/schedules/open-play` n'était
-- appelé par aucun client, et les contrôles d'ouvreur se refont depuis la date.
--
-- L'index doit tomber avant la colonne : SQLite refuse de supprimer une colonne indexée.
-- `open_play_sessions.season_code`, lui, n'en portait aucun.

DROP INDEX `schedule_slots_season_weekday_idx`;--> statement-breakpoint
ALTER TABLE `schedule_slots` DROP COLUMN `season_code`;--> statement-breakpoint
CREATE INDEX `schedule_slots_weekday_idx` ON `schedule_slots` (`weekday`,`start_time`);--> statement-breakpoint
ALTER TABLE `open_play_sessions` DROP COLUMN `season_code`;
