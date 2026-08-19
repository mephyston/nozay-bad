-- Inscriptions des adhérents aux événements de l'agenda.
--
-- Le club ouvre régulièrement des inscriptions — un stage, une soirée raclette, une
-- assemblée générale. Elles se prenaient par SMS et de bouche à oreille, et personne
-- ne savait combien de couverts prévoir.
--
-- Trois valeurs pour l'état des inscriptions plutôt qu'un booléen : « sans objet » et
-- « closes » ne disent pas la même chose au lecteur. Le défaut `none` est ce qui rend
-- cette migration muette — aucun événement déjà en base ne se met soudain à proposer
-- une inscription.
ALTER TABLE `club_events` ADD `registration` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
-- Pas de clé étrangère vers `members` : cette table porte une ligne par licence *et
-- par saison*, donc l'identifiant d'un adhérent change au renouvellement. Le nom, le
-- prénom et l'e-mail sont recopiés à l'inscription — même raisonnement que
-- `cms_posts.author_name`, et c'est de toute façon la seule chose que le bureau vient
-- lire : autant qu'elle ne demande aucune jointure.
CREATE TABLE `club_event_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`guests` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `club_events`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
-- Une inscription par adhérent et par événement. C'est cette contrainte qui rend
-- l'inscription idempotente : se réinscrire met à jour le nombre d'accompagnants au
-- lieu de créer une seconde ligne, et un double-clic ne fausse jamais le compte.
CREATE UNIQUE INDEX `club_event_registrations_event_member_idx` ON `club_event_registrations` (`event_id`,`member_id`);--> statement-breakpoint
-- Événement que l'actualité annonce, s'il y en a un : sert à porter l'appel à
-- l'inscription au bout de l'article. Entier nu et sans clé étrangère — la déclarer
-- ferait dépendre le CMS du domaine `events` pour stocker un numéro. Le lien est
-- résolu à la lecture, et un identifiant orphelin est ignoré au rendu.
ALTER TABLE `cms_posts` ADD `event_id` integer;--> statement-breakpoint
-- Droit de lecture de la liste nominative des inscrits. Distinct de la tenue de
-- l'agenda : une fiche d'événement est publique, la liste de ses inscrits est une
-- donnée personnelle d'adhérents. Ouvrir ou fermer les inscriptions reste couvert par
-- `events:events:write`, c'est un champ de l'événement.
--
-- Bloc généré depuis ROLE_PERMISSIONS (libs/domains/iam/shared/roles.ts) :
-- `libs/migrations.test.ts` rejoue les migrations et compare au code, le fichier ne
-- peut donc pas en diverger. `super_admin` reste absent, il vaut tout le catalogue.
INSERT OR IGNORE INTO `role_permissions` (`role`, `permission`, `created_at`) VALUES
  ('president', 'events:registrations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('secretaire', 'events:registrations:read', CAST(strftime('%s','now') AS INTEGER)),
  ('communication', 'events:registrations:read', CAST(strftime('%s','now') AS INTEGER));
