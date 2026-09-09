-- Séances individuelles : les soirées que l'entraîneur ouvre aux compétiteurs, et les
-- candidatures qu'il départage.
--
-- Au début de l'entraînement compétiteurs du mardi et du jeudi, l'entraîneur prend deux
-- fois trente minutes pour travailler avec une ou deux personnes. Les demandes arrivaient
-- sur WhatsApp et le choix se faisait de mémoire — qui a déjà eu sa séance, qui est
-- jeune. Ces deux tables donnent à ce choix la trace qui lui manquait.
--
-- Migration strictement additive : l'ancien code ignore ces deux tables.
--
-- `indiv_sessions` ne stocke ni fin ni créneaux : le k-ième créneau va de
-- `start_time + (k-1) * slot_minutes` à `start_time + k * slot_minutes`. Les trois
-- réglages sont portés par la séance, comme `min_players` en jeu libre, pour que changer
-- l'habitude l'an prochain ne réécrive pas les soirées déjà tenues. Pas de `season_code`
-- non plus, la saison se lit dans la date.
--
-- `indiv_requests` porte la demande et la réponse sur la même ligne : `selected_slot`
-- est la décision de l'entraîneur, nulle tant qu'il n'a pas retenu. L'identité est
-- recopiée (une liste de retenus est une trace), et `member_group` fige le libellé du
-- type d'adhésion qui a ouvert la porte. La licence sert aux statistiques d'équité, qui
-- traversent les saisons là où une adhésion ne vit qu'un an.
--
-- Droits : l'entraîneur tient les séances et choisit (lecture et écriture), la
-- présidence et le secrétariat consultent. `super_admin` est absent, calculé en code.
CREATE TABLE `indiv_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venue_id` integer NOT NULL,
	`slot_id` integer,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`slot_count` integer DEFAULT 2 NOT NULL,
	`slot_minutes` integer DEFAULT 30 NOT NULL,
	`capacity_per_slot` integer DEFAULT 2 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`announced_at` integer,
	`label` text,
	`notes` text,
	`cancelled_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `schedule_slots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `indiv_sessions_date_venue_start_idx` ON `indiv_sessions` (`date`,`venue_id`,`start_time`);
--> statement-breakpoint
CREATE INDEX `indiv_sessions_date_idx` ON `indiv_sessions` (`date`,`start_time`);
--> statement-breakpoint
CREATE TABLE `indiv_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`licence` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`member_group` text NOT NULL,
	`preferred_slot` integer,
	`note` text,
	`selected_slot` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `indiv_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `indiv_requests_session_member_idx` ON `indiv_requests` (`session_id`,`member_id`);
--> statement-breakpoint
CREATE INDEX `indiv_requests_licence_idx` ON `indiv_requests` (`licence`);
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('coach', 'schedules:indiv:read', CAST(strftime('%s','now') AS INTEGER)),
  ('coach', 'schedules:indiv:write', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'schedules:indiv:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'schedules:indiv:read', CAST(strftime('%s','now') AS INTEGER));
