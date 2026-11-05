-- Abonnement d'un adhérent à son agenda depuis son calendrier personnel.
--
-- Un agenda abonné ne sait pas ouvrir de session : l'adresse secrète est son seul
-- identifiant. Seule l'empreinte du jeton est gardée, pour qu'une copie de la base ne
-- donne aucune adresse valable. Rattaché à la personne et non à l'adhésion, dont
-- l'identifiant change à chaque saison : l'abonnement survit au renouvellement.
--
-- Migration additive. Un retour arrière ignore simplement la table.
CREATE TABLE `calendar_feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_feeds_person_idx` ON `calendar_feeds` (`person_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_feeds_token_idx` ON `calendar_feeds` (`token_hash`);
