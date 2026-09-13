-- L'identité du club et les fonctionnalités qu'il utilise.
--
-- Jusqu'ici l'application ne servait qu'un club, et tout ce qui le désignait — nom,
-- sigle, adresse, mentions légales, IBAN, préfixe des équipes et des factures, couleur
-- de la marque — était écrit dans le code, à cent quinze endroits. Ces deux tables les
-- rassemblent : `club_settings` est un formulaire (une ligne, `id = 1`, comme
-- `attestation_config`), `club_features` porte une ligne par fonctionnalité que le
-- bureau a éteinte.
--
-- Migration strictement additive : l'ancien code ignore ces tables. La ligne semée
-- reprend les valeurs qui étaient en dur, à l'identique, pour que rien ne change à
-- l'écran ni sur les documents au déploiement. Les images des documents (bande
-- d'en-tête, bas de page, tampon, logos partenaires) ne sont pas semées ici : elles
-- vivent dans R2 et sont déposées par `scripts/upload-club-assets.mjs` après la
-- migration, qui inscrit leurs clés.
--
-- Droits : la présidence et la trésorerie règlent (représentation légale, documents
-- imprimés), le secrétariat consulte. `super_admin` est absent, calculé en code.
CREATE TABLE `club_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`slug` text NOT NULL,
	`tagline` text DEFAULT '' NOT NULL,
	`city` text NOT NULL,
	`postal_code` text NOT NULL,
	`department` text NOT NULL,
	`region` text NOT NULL,
	`address_lines` text DEFAULT '' NOT NULL,
	`contact_email` text NOT NULL,
	`treasurer_email` text NOT NULL,
	`president_email` text NOT NULL,
	`sender_name` text NOT NULL,
	`ffbad_membership_url` text DEFAULT '' NOT NULL,
	`legal_seat` text DEFAULT '' NOT NULL,
	`publication_director` text DEFAULT '' NOT NULL,
	`rna` text DEFAULT '' NOT NULL,
	`siret` text DEFAULT '' NOT NULL,
	`ddjs_approval` text DEFAULT '' NOT NULL,
	`ffbad_affiliation` text DEFAULT '' NOT NULL,
	`bank_holder` text DEFAULT '' NOT NULL,
	`bank_name` text DEFAULT '' NOT NULL,
	`iban` text DEFAULT '' NOT NULL,
	`bic` text DEFAULT '' NOT NULL,
	`team_prefix` text NOT NULL,
	`invoice_prefix` text NOT NULL,
	`championship_committee` text DEFAULT '' NOT NULL,
	`league` text DEFAULT '' NOT NULL,
	`brand_color` text NOT NULL,
	`logo_key` text,
	`letterhead_header_key` text,
	`letterhead_footer_key` text,
	`stamp_key` text,
	`partner_logo_keys` text DEFAULT '[]' NOT NULL,
	`timezone` text DEFAULT 'Europe/Paris' NOT NULL,
	`daily_send_hour` integer DEFAULT 8 NOT NULL,
	`weekly_send_day` text DEFAULT 'MON' NOT NULL,
	`weekly_send_hour` integer DEFAULT 9 NOT NULL,
	`unpaid_reminder_delay_days` integer DEFAULT 7 NOT NULL,
	`email_signature` text DEFAULT '' NOT NULL,
	`member_welcome_text` text DEFAULT '' NOT NULL,
	`indiv_eligibility_keyword` text DEFAULT 'compétiteur' NOT NULL,
	`updated_by_email` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_features` (
	`feature` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`updated_by_email` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `club_settings` (
	`id`, `name`, `short_name`, `slug`, `tagline`, `city`, `postal_code`, `department`, `region`, `address_lines`,
	`contact_email`, `treasurer_email`, `president_email`, `sender_name`, `ffbad_membership_url`,
	`legal_seat`, `publication_director`, `rna`, `siret`, `ddjs_approval`, `ffbad_affiliation`,
	`bank_holder`, `bank_name`, `iban`, `bic`,
	`team_prefix`, `invoice_prefix`, `championship_committee`, `league`,
	`brand_color`, `email_signature`, `updated_at`
) VALUES (
	1, 'Nozay Badminton Association', 'NBA 91', 'nozay', 'Plus qu''une Tribu !', 'Nozay', '91620', '91', 'Essonne', 'Place de la Mairie
91620 Nozay',
	'tresorier@nozaybad.fr', 'tresorier@nozaybad.fr', 'president@nozaybad.fr', 'Nozay Badminton Association', 'https://www.myffbad.fr/adherer/NBA91',
	'Mairie de Nozay, 91620 NOZAY', 'Fabien LE BLEVEC', '0913011863', '433 218 716 00010', '91 S 744', 'LIFB.91.96.018',
	'Nozay Badminton', 'Société Générale', 'FR76 3000 3008 4600 0500 0784 720', 'SOGEFRPP',
	'NBA91', 'NBA91', 'CD91', 'LIFB',
	'#23B8E9', 'Nozay Badminton Association', CAST(strftime('%s','now') AS INTEGER)
);
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'settings:club:read', CAST(strftime('%s','now') AS INTEGER)),
  ('president', 'settings:club:write', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'settings:club:read', CAST(strftime('%s','now') AS INTEGER)),
  ('tresorier', 'settings:club:write', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'settings:club:read', CAST(strftime('%s','now') AS INTEGER));
