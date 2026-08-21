-- Séparer la personne de l'adhésion.
--
-- `members` portait deux grains à la fois : une ligne par (licence, saison), donc
-- l'identité d'un licencié recopiée à chaque rentrée et réécrite par l'import Poona.
-- Toute donnée durable devait alors se réfugier dans une table annexe à clé `licence`
-- sans clé étrangère — `member_club_functions`, puis `member_profiles`. `persons` est la
-- cible que ces contournements désignaient.
--
-- Cette migration **crée et remplit**. La suivante (`0019`) retire ce qui a été repris :
-- deux fichiers plutôt qu'un, pour que la reprise des données soit lisible séparément de
-- la suppression, et parce que drizzle-kit exige un terminal interactif pour arbitrer
-- entre création et renommage — arbitrage qu'on lui épargne en découpant.
--
-- Les `id` des adhésions sont **conservés à l'identique** : cinq tables les stockent
-- durablement (`orders`, `expenses`, `ledger_entries`, `checks`,
-- `club_event_registrations`) sans avoir jamais déclaré de clé étrangère. Les laisser
-- changer de sens aurait rattaché des écritures comptables à quelqu'un d'autre.
CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`last_name` text NOT NULL,
	`first_name` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text NOT NULL,
	`email` text,
	`phone` text,
	`parent1_name` text,
	`parent1_email` text,
	`parent1_phone` text,
	`parent2_name` text,
	`parent2_email` text,
	`parent2_phone` text,
	`photo_key` text,
	`photo_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persons_licence_idx` ON `persons` (`licence`);--> statement-breakpoint
-- Une personne par licence, l'adhésion la plus récente faisant foi pour l'identité.
--
-- « La plus récente » se juge sur la **fin de saison**, jamais sur `season_id` : les
-- saisons ont été créées dans le désordre (24-25 porte l'id 3, après 25-26 et 26-27), et
-- un `MAX(season_id)` aurait donc élu la plus ancienne. `LEFT JOIN` pour qu'une adhésion
-- dont la saison aurait disparu ne fasse pas disparaître la personne avec elle ; en SQLite
-- un `end_date` nul se classe dernier en `DESC`, elle ne l'emporte donc qu'à défaut d'autre.
--
-- Vérifié sur la production avant la bascule : aucune licence n'a d'identité divergente
-- d'une saison à l'autre. Il n'y a rien à arbitrer, seulement à choisir une ligne source.
INSERT INTO `persons` (`licence`, `last_name`, `first_name`, `gender`, `birth_date`,
                       `email`, `phone`,
                       `parent1_name`, `parent1_email`, `parent1_phone`,
                       `parent2_name`, `parent2_email`, `parent2_phone`,
                       `created_at`, `updated_at`)
SELECT `licence`, `last_name`, `first_name`, `gender`, `birth_date`,
       `email`, `phone`,
       `parent1_name`, `parent1_email`, `parent1_phone`,
       `parent2_name`, `parent2_email`, `parent2_phone`,
       `imported_at`, `imported_at`
FROM (
  SELECT m.*, ROW_NUMBER() OVER (
           PARTITION BY m.licence ORDER BY s.end_date DESC, m.id DESC
         ) AS rn
  FROM `members` m
  LEFT JOIN `seasons` s ON s.id = m.season_id
)
WHERE rn = 1;--> statement-breakpoint
-- Les coordonnées manquantes sont comblées par la valeur connue la plus récente.
--
-- Les exports Poona se sont étoffés au fil des saisons : une adhésion récente peut ne rien
-- porter là où une plus ancienne portait un numéro. Sur la production, c'est l'explication
-- de la quasi-totalité des écarts entre saisons — deux personnes seulement ont vu leur
-- téléphone réellement changer. On comble, on n'écrase jamais.
UPDATE `persons` SET
  `email` = COALESCE(`email`, (
    SELECT m.`email` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`email` IS NOT NULL AND m.`email` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `phone` = COALESCE(`phone`, (
    SELECT m.`phone` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`phone` IS NOT NULL AND m.`phone` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent1_name` = COALESCE(`parent1_name`, (
    SELECT m.`parent1_name` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent1_name` IS NOT NULL AND m.`parent1_name` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent1_email` = COALESCE(`parent1_email`, (
    SELECT m.`parent1_email` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent1_email` IS NOT NULL AND m.`parent1_email` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent1_phone` = COALESCE(`parent1_phone`, (
    SELECT m.`parent1_phone` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent1_phone` IS NOT NULL AND m.`parent1_phone` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent2_name` = COALESCE(`parent2_name`, (
    SELECT m.`parent2_name` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent2_name` IS NOT NULL AND m.`parent2_name` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent2_email` = COALESCE(`parent2_email`, (
    SELECT m.`parent2_email` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent2_email` IS NOT NULL AND m.`parent2_email` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1)),
  `parent2_phone` = COALESCE(`parent2_phone`, (
    SELECT m.`parent2_phone` FROM `members` m LEFT JOIN `seasons` s ON s.id = m.season_id
    WHERE m.`licence` = `persons`.`licence` AND m.`parent2_phone` IS NOT NULL AND m.`parent2_phone` <> ''
    ORDER BY s.end_date DESC, m.id DESC LIMIT 1));--> statement-breakpoint
-- Le portrait suit la personne : `member_profiles` était déjà à ce grain, c'est sa
-- fusion. Un profil dont la licence n'adhère plus n'a pas de ligne `persons` — sa photo
-- est alors abandonnée avec sa table, ce que `0019` acte.
UPDATE `persons` SET
  `photo_key` = (SELECT p.`photo_key` FROM `member_profiles` p WHERE p.`licence` = `persons`.`licence`),
  `photo_updated_at` = (SELECT p.`photo_updated_at` FROM `member_profiles` p WHERE p.`licence` = `persons`.`licence`)
WHERE `licence` IN (SELECT `licence` FROM `member_profiles`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`season_id` integer NOT NULL,
	`status` text DEFAULT 'valide' NOT NULL,
	`type` text NOT NULL,
	`imported_at` integer NOT NULL,
	`amount_due_cents` integer DEFAULT 0 NOT NULL,
	`amount_received_cents` integer DEFAULT 0 NOT NULL,
	`amount_remaining_cents` integer DEFAULT 0 NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`payment_date` text,
	`expense_authorized` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_person_season_idx` ON `memberships` (`person_id`,`season_id`);--> statement-breakpoint
-- `id` repris explicitement : c'est toute la raison d'être de cette forme d'insertion.
-- Laisser l'auto-incrément renuméroter aurait fait pointer chaque commande, note de frais,
-- écriture et inscription vers une autre adhésion que la sienne.
INSERT INTO `memberships` (`id`, `person_id`, `season_id`, `status`, `type`, `imported_at`,
                           `amount_due_cents`, `amount_received_cents`, `amount_remaining_cents`,
                           `paid`, `payment_date`, `expense_authorized`)
SELECT m.`id`, p.`id`, m.`season_id`, m.`status`, m.`type`, m.`imported_at`,
       m.`amount_due_cents`, m.`amount_received_cents`, m.`amount_remaining_cents`,
       m.`paid`, m.`payment_date`, m.`expense_authorized`
FROM `members` m
JOIN `persons` p ON p.`licence` = m.`licence`;
