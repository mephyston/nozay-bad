-- Interclubs : équipes, staff, effectifs, calendrier des journées, compositions,
-- et classements fédéraux historisés.
--
-- Le club engage huit équipes réparties sur quatre championnats dont les règlements
-- divergent — format de rencontre, barème, formule de valeur d'équipe. Ces règles vivent
-- en code (`libs/domains/teams/shared/championship.ts`), pas ici : elles changent quand
-- un comité vote, en même temps que le code qui les applique.
--
-- Deux partis pris structurent ces tables :
--   * `season_code` est recopié, jamais lié — `seasons` appartient au domaine comptable
--     et la VSA proscrit le SQL traversant les frontières de domaine.
--   * un joueur est désigné par sa **licence**, jamais par `members.id` : `members` porte
--     une ligne par licence *et par saison*, donc son identifiant change chaque été,
--     alors qu'une équipe doit lui survivre.
--
-- `player_rankings` est historisée par date ELO plutôt qu'écrasée à chaque import : les
-- règlements ne lisent pas le classement courant mais celui d'une date arrêtée — fixe
-- pour la saison en départemental (art. 6.1.3), glissante en régional (art. 4.4.2).
-- Sans historique, on ne pourrait ni recalculer une journée passée ni justifier une
-- valeur d'équipe contestée.

CREATE TABLE `championship_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`championship` text NOT NULL,
	`number` integer NOT NULL,
	`week_start` text NOT NULL,
	`week_end` text NOT NULL,
	`reference_elo_date` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_days_idx` ON `championship_days` (`season_code`,`championship`,`number`);--> statement-breakpoint
CREATE TABLE `championship_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`championship` text NOT NULL,
	`reference_elo_date` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `championship_settings_idx` ON `championship_settings` (`season_code`,`championship`);--> statement-breakpoint
CREATE TABLE `club_teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`championship` text NOT NULL,
	`division` text NOT NULL,
	`number` integer NOT NULL,
	`pool_label` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_teams_season_championship_number_idx` ON `club_teams` (`season_code`,`championship`,`number`);--> statement-breakpoint
CREATE TABLE `lineup_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fixture_id` integer NOT NULL,
	`discipline` text NOT NULL,
	`position` integer NOT NULL,
	`licence1` text NOT NULL,
	`licence2` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`updated_by_licence` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`fixture_id`) REFERENCES `team_fixtures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lineup_slots_fixture_discipline_position_idx` ON `lineup_slots` (`fixture_id`,`discipline`,`position`);--> statement-breakpoint
CREATE TABLE `player_rankings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`elo_date` text NOT NULL,
	`season_code` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`category` text,
	`mutation` text DEFAULT 'none' NOT NULL,
	`singles` text,
	`doubles` text,
	`mixed` text,
	`singles_rank` integer,
	`doubles_rank` integer,
	`mixed_rank` integer,
	`cpph_singles` integer,
	`cpph_doubles` integer,
	`cpph_mixed` integer,
	`source` text DEFAULT 'import' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_rankings_licence_date_idx` ON `player_rankings` (`licence`,`elo_date`);--> statement-breakpoint
CREATE INDEX `player_rankings_date_idx` ON `player_rankings` (`elo_date`);--> statement-breakpoint
CREATE TABLE `ranking_imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`elo_date` text NOT NULL,
	`season_code` text NOT NULL,
	`file_name` text,
	`rows_imported` integer DEFAULT 0 NOT NULL,
	`non_competitors` integer DEFAULT 0 NOT NULL,
	`unmatched_members` integer DEFAULT 0 NOT NULL,
	`imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_fixtures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`day_id` integer NOT NULL,
	`slot` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`played_at` text,
	`home` integer DEFAULT true NOT NULL,
	`opponent` text,
	`venue` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `club_teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`day_id`) REFERENCES `championship_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_fixtures_team_day_slot_idx` ON `team_fixtures` (`team_id`,`day_id`,`slot`);--> statement-breakpoint
CREATE TABLE `team_roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`licence` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `club_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_roster_team_licence_idx` ON `team_roster` (`team_id`,`licence`);--> statement-breakpoint
CREATE TABLE `team_staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`licence` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `club_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_staff_team_role_idx` ON `team_staff` (`team_id`,`role`);

--> statement-breakpoint
-- Droits des rôles sur les interclubs.
--
-- L'entraîneur est le seul à porter l'écriture : engager les équipes, désigner les
-- capitaines, tenir les classements et contrôler les valeurs d'équipe avant chaque
-- journée sont son métier. Président et secrétaire consultent.
--
-- `super_admin` est volontairement absent : il vaut la totalité du catalogue, calculée
-- en code. Figé en base, il n'obtiendrait pas les permissions des fonctionnalités à venir.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'teams:teams:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'teams:rankings:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'teams:lineups:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'teams:teams:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'teams:rankings:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'teams:lineups:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:teams:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:teams:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:teams:delete', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:rankings:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:rankings:write', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:rankings:import', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:lineups:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'teams:lineups:write', CAST(strftime('%s','now') AS INTEGER));
