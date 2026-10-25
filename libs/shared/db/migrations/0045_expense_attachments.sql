-- Plusieurs pièces jointes par note de frais.
--
-- Une note ne portait qu'un justificatif, dans `expenses.photo_url` : un déplacement
-- (péage, carburant, repas) se déclarait en autant de notes que de tickets. Les pièces
-- passent dans une table à part, une ligne par pièce et cinq au plus par note. Une
-- seule colonne ne pouvait pas les recevoir toutes : une pièce pèse jusqu'à ~1,1 Mo en
-- base64, et D1 plafonne une ligne à 2 Mo.
--
-- `media_type` est tiré de l'adresse `data:` (« image/webp », « application/pdf ») pour
-- que la liste des notes dise ce qu'elle montre sans lire le contenu.
--
-- Migration additive : les justificatifs existants sont recopiés, et `photo_url` reste
-- en place. Le nouveau code y recopie la première pièce à chaque écriture et ne la lit
-- plus : l'ancien code, qui ne lit qu'elle, retrouve un justificatif par note après un
-- retour arrière. Elle tombera dans une version ultérieure.
CREATE TABLE `expense_attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expense_id` integer NOT NULL,
	`position` integer NOT NULL,
	`media_type` text NOT NULL,
	`data_url` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expense_attachments_expense_id_idx` ON `expense_attachments` (`expense_id`,`position`);
--> statement-breakpoint
INSERT INTO `expense_attachments` (`expense_id`, `position`, `media_type`, `data_url`, `created_at`)
SELECT
	`id`,
	0,
	CASE
		WHEN `photo_url` LIKE 'data:%' AND instr(`photo_url`, ';') > 6
			THEN substr(`photo_url`, 6, instr(`photo_url`, ';') - 6)
		ELSE 'application/octet-stream'
	END,
	`photo_url`,
	`created_at`
FROM `expenses`
WHERE `photo_url` IS NOT NULL AND `photo_url` <> '';
