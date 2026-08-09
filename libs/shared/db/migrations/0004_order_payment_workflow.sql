-- Workflow de paiement des commandes boutique.
--
-- `pending | approved | rejected` devient `created | awaiting_payment | paid |
-- rejected | cancelled`. La reprise est directe : `approved` valait « payée et
-- passée en compta », `pending` valait « demande non traitée ». Aucune ligne
-- existante ne peut atterrir en `awaiting_payment` : cet état n'existait pas, et
-- rien en base ne dit si le bureau avait validé une demande.
--
-- Le défaut de la colonne `status` change également : SQLite ne sait pas le
-- réécrire en place, d'où la reconstruction de la table. Aucune autre table ne
-- référence `orders` (vérifié sur le baseline), la manœuvre est donc sans effet de
-- bord sur les clés étrangères.
--
-- Le SQL est écrit à la main (drizzle-kit ne sait pas produire la reprise de
-- données) ; seul l'instantané `meta/0003_snapshot.json` vient de `drizzle-kit
-- generate`, pour que le contrôle de dérive reste vert. Le décalage entre l'index
-- du journal drizzle et le numéro de fichier préexiste à cette migration.
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`total_amount_cents` integer NOT NULL,
	`payment_method_id` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`awaiting_payment_since` text,
	`paid_at` text,
	`ledger_entry_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_orders` (
	`id`, `season_id`, `member_id`, `product_id`, `quantity`, `total_amount_cents`,
	`payment_method_id`, `status`, `awaiting_payment_since`, `paid_at`,
	`ledger_entry_id`, `created_at`
)
SELECT
	`id`, `season_id`, `member_id`, `product_id`, `quantity`, `total_amount_cents`,
	`payment_method_id`,
	CASE `status`
		WHEN 'approved' THEN 'paid'
		WHEN 'pending' THEN 'created'
		ELSE `status`
	END,
	NULL,
	`paid_at`,
	`ledger_entry_id`,
	`created_at`
FROM `orders`;
--> statement-breakpoint
DROP TABLE `orders`;
--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;
