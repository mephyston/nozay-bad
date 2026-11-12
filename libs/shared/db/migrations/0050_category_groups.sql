-- Pôles et rubriques du tableau de bord, rangés par le bureau.
--
-- Les pôles se reconnaissaient jusqu'ici à des mots du libellé des catégories, en dur
-- dans l'API : renommer une catégorie la faisait sortir de son pôle sans un mot. Chaque
-- catégorie porte désormais son pôle et sa rubrique (« Où va votre cotisation »).
--
-- Reprise : les quatre pôles d'hier, et un premier rangement par les mêmes mots, dans
-- le même ordre de priorité que l'ancien code. Les rubriques sont proposées de la même
-- manière, et le bureau corrige à l'écran.
--
-- Migration additive. Un retour arrière ignore la table et les deux colonnes.
CREATE TABLE `category_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`membership_fees` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `category_groups_kind_check` CHECK (`kind` IN ('pole', 'rubrique'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_groups_kind_label_idx` ON `category_groups` (`kind`,`label`);
--> statement-breakpoint
ALTER TABLE `categories` ADD `pole_id` integer REFERENCES category_groups(id) ON DELETE set null;
--> statement-breakpoint
ALTER TABLE `categories` ADD `rubrique_id` integer REFERENCES category_groups(id) ON DELETE set null;
--> statement-breakpoint
INSERT OR IGNORE INTO `category_groups` (`kind`, `label`, `position`, `membership_fees`, `created_at`) VALUES
	('pole', 'Pôle Compétition', 1, 0, CAST(strftime('%s', 'now') AS integer)),
	('pole', 'Pôle Jeunes', 2, 0, CAST(strftime('%s', 'now') AS integer)),
	('pole', 'Pôle Matériel', 3, 0, CAST(strftime('%s', 'now') AS integer)),
	('pole', 'Pôle Fonctionnement', 4, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Cotisations', 1, 1, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Encadrement (salaires et charges)', 2, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Licences et affiliation', 3, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Volants et matériel', 4, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Compétitions', 5, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Stages et actions jeunes', 6, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Tournois, buvette et événements', 7, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Subventions et dons', 8, 0, CAST(strftime('%s', 'now') AS integer)),
	('rubrique', 'Fonctionnement', 9, 0, CAST(strftime('%s', 'now') AS integer));
--> statement-breakpoint
UPDATE `categories` SET `pole_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'pole' AND `label` = 'Pôle Compétition')
WHERE `pole_id` IS NULL AND (`admin_label` LIKE '%tournoi%' OR `admin_label` LIKE '%blackminton%' OR `admin_label` LIKE '%buvette%' OR `admin_label` LIKE '%championnat%' OR `admin_label` LIKE '%interclub%');
--> statement-breakpoint
UPDATE `categories` SET `pole_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'pole' AND `label` = 'Pôle Jeunes')
WHERE `pole_id` IS NULL AND (`admin_label` LIKE '%stage%' OR `admin_label` LIKE '%jeune%');
--> statement-breakpoint
UPDATE `categories` SET `pole_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'pole' AND `label` = 'Pôle Matériel')
WHERE `pole_id` IS NULL AND (`admin_label` LIKE '%cordage%' OR `admin_label` LIKE '%volant%' OR `admin_label` LIKE '%textile%' OR `admin_label` LIKE '%boutique%' OR `admin_label` LIKE '%mat_riel%');
--> statement-breakpoint
UPDATE `categories` SET `pole_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'pole' AND `label` = 'Pôle Fonctionnement')
WHERE `pole_id` IS NULL AND (`admin_label` LIKE '%salaire%' OR `admin_label` LIKE '%charge%' OR `admin_label` LIKE '%licence%' OR `admin_label` LIKE '%adh_sion%' OR `admin_label` LIKE '%cotisation%' OR `admin_label` LIKE '%affiliation%' OR `admin_label` LIKE '%subvention%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Cotisations')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%adh_sion%' OR `admin_label` LIKE '%cotisation%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Encadrement (salaires et charges)')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%salaire%' OR `admin_label` LIKE '%entra_neur%' OR `admin_label` LIKE '%coach%' OR `admin_label` LIKE '%encadrement%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Licences et affiliation')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%licence%' OR `admin_label` LIKE '%affiliation%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Stages et actions jeunes')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%stage%' OR `admin_label` LIKE '%jeune%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Compétitions')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%championnat%' OR `admin_label` LIKE '%interclub%' OR `admin_label` LIKE '%comp_tition%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Tournois, buvette et événements')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%tournoi%' OR `admin_label` LIKE '%buvette%' OR `admin_label` LIKE '%blackminton%' OR `admin_label` LIKE '%_v_nement%' OR `admin_label` LIKE '%party%' OR `admin_label` LIKE '%soir_e%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Volants et matériel')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%volant%' OR `admin_label` LIKE '%cordage%' OR `admin_label` LIKE '%mat_riel%' OR `admin_label` LIKE '%textile%' OR `admin_label` LIKE '%boutique%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Subventions et dons')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%subvention%' OR `admin_label` = 'Don' OR `admin_label` LIKE 'Dons%' OR `admin_label` LIKE '%partenari%' OR `admin_label` LIKE '%sponsor%' OR `admin_label` LIKE '%m_c_nat%');
--> statement-breakpoint
UPDATE `categories` SET `rubrique_id` = (SELECT `id` FROM `category_groups` WHERE `kind` = 'rubrique' AND `label` = 'Fonctionnement')
WHERE `rubrique_id` IS NULL AND (`admin_label` LIKE '%frais%' OR `admin_label` LIKE '%int_r_t%' OR `admin_label` LIKE '%assurance%' OR `admin_label` LIKE '%charge%' OR `admin_label` LIKE '%fonctionnement%');
--> statement-breakpoint
INSERT OR IGNORE INTO `club_features` (`feature`, `enabled`, `updated_at`) VALUES ('fee_breakdown', 0, CAST(strftime('%s', 'now') AS integer));
