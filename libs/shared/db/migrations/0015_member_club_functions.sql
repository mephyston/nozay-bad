-- Fonction au club : bureau, comité d'administration et entraîneurs, par saison.
--
-- Pourquoi une table annexe et pas une colonne de `members` : l'import Poona écrase
-- les lignes adhérents (`onConflictDoUpdate`) à chaque ré-import ; une colonne saisie
-- à la main y serait perdue. La personne est désignée par sa **licence** — la clé
-- naturelle stable d'une saison à l'autre, même convention que `team_staff` — et sans
-- clé étrangère : la fonction survit à un ré-import qui recréerait la ligne adhérent.
-- La saison reste `season_id` (entier) : on ne franchit aucune frontière de domaine,
-- inutile de recopier le code saison comme le fait le domaine teams.
--
-- Deux unicités :
--   * (season_id, licence) — pas de cumul : un adhérent ne porte qu'UNE fonction par
--     saison (le président ne peut pas être aussi trésorier) ;
--   * index PARTIEL (season_id, function) limité à président / secrétaire / trésorier /
--     trésorier adjoint — les statuts du club n'admettent qu'un titulaire par saison
--     pour ces fonctions. Le handler applicatif porte la même règle avec un message
--     français ; l'index la garantit contre les écritures concurrentes ou hors
--     application. Les autres fonctions (vice-présidents, membres du CA, entraîneurs)
--     acceptent plusieurs titulaires et échappent volontairement à cet index.
CREATE TABLE `member_club_functions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`licence` text NOT NULL,
	`function` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_club_functions_season_licence_idx` ON `member_club_functions` (`season_id`,`licence`);--> statement-breakpoint
CREATE UNIQUE INDEX `member_club_functions_single_holder_idx` ON `member_club_functions` (`season_id`,`function`) WHERE "function" IN ('president', 'secretary', 'treasurer', 'treasurer_deputy');