-- Profil durable d'un adhérent : ce que la personne est, et non ce que la saison
-- lui attribue.
--
-- Ni `season_id`, ni clé étrangère. `members` porte une ligne par (licence, saison) :
-- un adhérent qui se réinscrit reçoit une nouvelle ligne et un nouvel `id`, si bien
-- qu'une photo rattachée à ce `id` serait à redéposer chaque rentrée. Et une colonne
-- posée sur `members` serait écrasée par l'import Poona (`onConflictDoUpdate`), comme
-- l'explique déjà `member_club_functions`. La clé est donc la **licence** — stable
-- d'une saison à l'autre — et la ligne survit à un ré-import qui recréerait l'adhérent.
--
-- `photo_key` porte le préfixe R2 du portrait (`member-photos/<empreinte>`), sans la
-- taille : les objets déposés sont `<préfixe>/512` et `<préfixe>/128`. Ce préfixe
-- `member-photos/` est ce qui rend la photo privée — la route publique du site
-- (`/media/[...key]`) n'accepte que les clés `media/<empreinte>/<fichier>`.
--
-- La table est le foyer prévu des prochaines données durables d'un adhérent (surnom,
-- présentation, préférences d'affichage). La cotisation, l'autorisation de notes de
-- frais et la fonction au club restent saisonnières et n'y ont pas leur place.
CREATE TABLE `member_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`licence` text NOT NULL,
	`photo_key` text,
	`photo_updated_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_profiles_licence_idx` ON `member_profiles` (`licence`);
