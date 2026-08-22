-- Séances de jeu libre : les inscriptions, les invités, et le bénévole qui ouvre.
--
-- Remplace un Google Sheet où le club posait une colonne par jour d'ouverture et laissait
-- les adhérents remplir les cases vides. Trois choses n'y marchaient pas : personne ne
-- savait qui s'était réellement inscrit, le seuil de quatre joueurs se surveillait à l'œil
-- nu, et l'invité qu'un adhérent amène — celui, précisément, que le bénévole qui ouvre la
-- porte ne connaît pas — n'y figurait nulle part.
--
-- Migration strictement additive : la version qui la porte reste rollbackable, l'ancien
-- code ignorant simplement ces quatre tables. Elle n'accorde AUCUN droit — les permissions
-- viendront avec le commit de lancement, et c'est ce décalage qui tient lieu de drapeau
-- côté administration : tant qu'aucun rôle ne les porte, seul le super-administrateur voit
-- l'écran.
--
-- Une séance datée, là où `schedule_slots` ne dit qu'une habitude. La grille hebdomadaire
-- dit « il y a jeu libre le samedi » ; cette table dit « le samedi 14 mars, de 14 h à 17 h,
-- à Pierre-Dupuis ». Distincte de `club_events` : un événement est un rendez-vous annoncé,
-- qui existe même sans inscrit ; une séance de jeu libre n'existe que si assez de monde
-- s'inscrit et qu'un bénévole vient ouvrir.
--
-- `slot_id` est nullable et `ON DELETE SET NULL` : le cas qui motive la fonctionnalité est
-- justement celui qui n'a pas de créneau — un dimanche de vacances, un jour férié — et
-- retirer un créneau de la grille ne doit pas effacer les séances déjà tenues sous lui.
--
-- `min_players` est porté par la séance et non par un réglage global : la colonne fige le
-- seuil au moment où la décision a été prise, si bien que changer le défaut l'an prochain
-- ne réécrit pas l'histoire.
--
-- `status` compte trois valeurs dont une seule ne se déduise pas, `cancelled`. `confirmed`
-- vaut exactement « `opener_licence` n'est pas nul » : dénormalisation assumée, gardée
-- parce qu'elle rend l'annulation représentable et que l'écran du bureau filtre sur une
-- colonne plutôt que sur trois. « Seuil atteint », en revanche, n'est pas un état — c'est
-- un calcul refait à chaque lecture, sans quoi il faudrait écrire à chaque désinscription.
--
-- L'ouvreur est désigné par sa licence, sans clé étrangère : le domaine est feuille, il ne
-- peut ni importer `members` ni nommer ses tables. Son identité est recopiée parce qu'elle
-- est une trace — qui a réellement ouvert le gymnase en novembre — et que retirer
-- quelqu'un de la liste des ouvreurs ne doit pas l'effacer des séances qu'il a tenues.
CREATE TABLE `open_play_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`venue_id` integer NOT NULL,
	`slot_id` integer,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`min_players` integer DEFAULT 4 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`opener_licence` text,
	`opener_first_name` text,
	`opener_last_name` text,
	`opened_at` integer,
	`label` text,
	`notes` text,
	`cancelled_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`slot_id`) REFERENCES `schedule_slots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- Clé naturelle de la séance : c'est elle qui rendra la génération en lot idempotente
-- (`ON CONFLICT DO NOTHING`), et surtout qui garantira que rejouer une période ne touche
-- pas les séances déjà pourvues.
CREATE UNIQUE INDEX `open_play_sessions_date_venue_start_idx` ON `open_play_sessions` (`date`,`venue_id`,`start_time`);
--> statement-breakpoint
CREATE INDEX `open_play_sessions_date_idx` ON `open_play_sessions` (`date`,`start_time`);
--> statement-breakpoint
-- Inscription d'un adhérent. `member_id` désigne une ADHÉSION (`memberships.id`) et non
-- une personne, sans clé étrangère : l'ADR-0006 le tranche pour les cinq colonnes
-- homonymes du dépôt — une inscription appartient à la saison où elle a eu lieu. La
-- colonne `licence` s'y ajoute, elle : c'est par elle qu'on reconnaît l'ouvreur parmi les
-- inscrits, et c'est ce que le bénévole relit à la porte du gymnase.
CREATE TABLE `open_play_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`licence` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `open_play_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Une inscription par adhérent et par séance. C'est cette contrainte qui rend
-- l'inscription idempotente — se réinscrire met à jour au lieu de doubler — et c'est aussi
-- la clé naturelle sur laquelle les invités se rattacheront dans le lot d'écriture,
-- `last_insert_rowid()` ne valant que pour un seul enfant.
CREATE UNIQUE INDEX `open_play_registrations_session_member_idx` ON `open_play_registrations` (`session_id`,`member_id`);
--> statement-breakpoint
-- Invités NOMMÉS, contrairement au compteur `club_event_registrations.guests`. Deux
-- raisons qui n'existaient pas pour une soirée raclette : le bénévole qui ouvre doit
-- savoir qui franchit la porte, et un invité non licencié pose une question d'assurance
-- que « 2 accompagnants » ne permet pas de traiter. Table enfant et non colonne JSON — le
-- seuil se compte en SQL, et les invités comptent dedans : quatre raquettes sur les
-- terrains, pas quatre licences. Pas d'unicité : la liste est remplacée en bloc à chaque
-- enregistrement, et c'est ce remplacement qui porte l'idempotence.
CREATE TABLE `open_play_guests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `open_play_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `open_play_guests_registration_idx` ON `open_play_guests` (`registration_id`);
--> statement-breakpoint
-- Détenteurs de badge autorisés à ouvrir une séance, par saison. AUCUNE identité recopiée
-- ici, à la différence de `open_play_sessions.opener_*` : c'est une liste courante, pas une
-- trace, et y recopier un prénom réintroduirait la divergence que l'ADR-0006 vient de
-- supprimer. Le précédent d'une liste de personnes désignées par le bureau,
-- `member_club_functions`, ne stocke lui non plus que (saison, licence).
--
-- Pourquoi pas une valeur de CLUB_FUNCTIONS : l'unique (season_id, licence) de cette
-- table-là interdit le cumul, or les détenteurs de badge SONT les gens du bureau — il
-- faudrait choisir entre « président » et « ouvreur ». Et une fonction se décide en
-- assemblée générale, un badge change quand la mairie les refait.
--
-- La liste vit dans ce domaine, et non dans `members`, pour que le refus « vous n'êtes pas
-- ouvreur » soit rendu par le handler ; ailleurs il remonterait dans l'application et
-- deviendrait contournable par un appel direct à l'API.
CREATE TABLE `open_play_openers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_code` text NOT NULL,
	`licence` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
-- Désigner deux fois la même personne n'est pas une erreur : l'écriture est idempotente.
CREATE UNIQUE INDEX `open_play_openers_season_licence_idx` ON `open_play_openers` (`season_code`,`licence`);
