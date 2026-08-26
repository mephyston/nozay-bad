-- Un virement interne devient **deux écritures liées**, et non plus une seule.
--
-- L'ancien modèle — une ligne portant `account_id` et `destination_account_id` — était juste
-- comptablement mais inapplicable au rapprochement : `bank_statement_line_id` est scalaire,
-- alors qu'un virement courant↔livret produit **deux** lignes de relevé (les deux comptes sont
-- importés en OFX). Une écriture ne pouvait en pointer qu'une. Pointer la jambe « courant »
-- laissait, côté livret, une écriture réputée pointée face à une ligne de relevé qui ne l'était
-- pas : un écart permanent de `−montant` dans l'état de rapprochement. Ne rien pointer faisait
-- boucler l'identité, mais laissait la ligne en `pending` — et `getPendingBankTransactions`
-- **bloque la clôture** sur une ligne `pending`.
--
-- D'où un contournement, devenu la norme : saisir le virement en deux `recette`/`depense`
-- portant la catégorie « Virements Internes ». Deux lignes, deux pointages, la clôture passe.
-- Le logiciel le fabriquait lui-même (`reconciliation-api.ts` ne crée jamais de `transfert`,
-- l'analyse IA suggère la catégorie). Résultat : deux représentations du même événement, dont
-- l'exclusion du compte de résultat tenait au **libellé** d'une catégorie modifiable.
--
-- Après cette migration, chaque jambe est une écriture ordinaire sur un compte, avec sa propre
-- date de valeur, son propre statut et son propre `bank_statement_line_id`. Le rapprochement
-- redevient trivial, l'argent en transit devient lisible (deux dates), et la catégorie n'a plus
-- d'objet : elle passe inactive.
--
-- Migration **destructive** : elle reconstruit `ledger_entries` pour retirer
-- `destination_account_id` et resserrer le CHECK. `rollback-horizon.mjs` la classera comme telle
-- et la version qui la porte n'est pas rollbackable — c'est délibéré. L'alternative additive
-- (garder la colonne en lui donnant le sens de « compte de contrepartie ») laissait l'ancien code
-- lire chaque jambe comme un virement complet : les deux jambes se compensaient et le solde
-- devenait **silencieusement** nul. Un retour arrière qui casse bruyamment vaut mieux qu'un
-- retour arrière qui ment.
--
-- Les identifiants d'écriture sont **conservés** : `checks.ledger_entry_id` les référence, et
-- l'ancienne jambe créditrice d'une paire garde le sien. Seule la jambe destinataire d'un
-- ancien `type='transfert'` reçoit un identifiant neuf, puisqu'elle n'existait pas.

-- 1. Un moyen de paiement propre aux virements.
--
-- `payment_method_id` est NOT NULL, et un transfert héritait jusqu'ici du moyen de paiement
-- resté dans le formulaire — donc d'un `default_entry_status` parasite (`in_vault` sur un
-- virement n'a aucun sens, et le calcul de solde l'ignorait sans le dire).
INSERT OR IGNORE INTO `payment_methods` (`code`, `label`, `default_account_id`, `default_entry_status`, `created_at`)
VALUES ('virement_interne', 'Virement interne', (SELECT `id` FROM `accounts` WHERE `code` = 'current'), 'cleared', 1787702400);
--> statement-breakpoint

-- 2. La table parente : l'identité du virement, et la clé naturelle du batch D1.
--
-- `last_insert_rowid()` ne vaut que pour un seul enfant ; avec deux jambes il faut une clé
-- naturelle, d'où `reference` en UNIQUE.
CREATE TABLE `internal_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`reference` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`description` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "internal_transfers_amount_cents_check" CHECK("amount_cents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `internal_transfers_reference_unique` ON `internal_transfers` (`reference`);
--> statement-breakpoint

-- 3. Appariement de la population « catégorie Virements Internes ».
--
-- Deux écritures se répondent si elles ont le même montant, un sens opposé, deux comptes
-- différents, le même exercice et moins de huit jours d'écart. On ne retient que les paires
-- **mutuellement uniques** : un débit qui a deux contreparties plausibles n'est pas converti,
-- il reste une dépense catégorisée et part en arbitrage. Trancher à sa place reviendrait à
-- décider justement là où la réponse n'est pas évidente.
CREATE TABLE `_vi_candidates` (`debit_id` integer NOT NULL, `credit_id` integer NOT NULL);
--> statement-breakpoint
INSERT INTO `_vi_candidates` (`debit_id`, `credit_id`)
SELECT d.`id`, c.`id`
FROM `ledger_entries` d
JOIN `ledger_entries` c
  ON c.`type` = 'recette'
 AND c.`amount_cents` = d.`amount_cents`
 AND c.`account_id` <> d.`account_id`
 AND c.`season_id` = d.`season_id`
 AND abs(julianday(c.`date`) - julianday(d.`date`)) <= 7
 AND c.`category_id` IN (SELECT `id` FROM `categories` WHERE lower(`admin_label`) LIKE '%virement%interne%')
WHERE d.`type` = 'depense'
  AND d.`category_id` IN (SELECT `id` FROM `categories` WHERE lower(`admin_label`) LIKE '%virement%interne%');
--> statement-breakpoint
CREATE TABLE `_vi_pairs` AS
SELECT `debit_id`, `credit_id` FROM `_vi_candidates`
WHERE `debit_id` IN (SELECT `debit_id` FROM `_vi_candidates` GROUP BY `debit_id` HAVING COUNT(*) = 1)
  AND `credit_id` IN (SELECT `credit_id` FROM `_vi_candidates` GROUP BY `credit_id` HAVING COUNT(*) = 1);
--> statement-breakpoint

-- 4. Un parent par virement, pour les deux populations.
INSERT INTO `internal_transfers` (`season_id`, `reference`, `amount_cents`, `description`, `created_at`)
SELECT le.`season_id`, 'VIR-T' || le.`id`, le.`amount_cents`, le.`description`, le.`created_at`
FROM `ledger_entries` le WHERE le.`type` = 'transfert';
--> statement-breakpoint
INSERT INTO `internal_transfers` (`season_id`, `reference`, `amount_cents`, `description`, `created_at`)
SELECT d.`season_id`, 'VIR-P' || p.`debit_id`, d.`amount_cents`, d.`description`, d.`created_at`
FROM `_vi_pairs` p JOIN `ledger_entries` d ON d.`id` = p.`debit_id`;
--> statement-breakpoint

-- 5. `checks` référence des écritures : on détache le temps de la reconstruction.
--
-- Un `DROP TABLE` sur une table parente déclenche un contrôle de clé étrangère immédiat. Plutôt
-- que de désarmer les contraintes par un PRAGMA — dont l'effet dans une migration D1 n'est pas
-- garanti — on met le lien de côté et on le rétablit à l'identique : les identifiants d'écriture
-- étant conservés, la restitution est exacte.
CREATE TABLE `_checks_ledger_link` (`check_id` integer NOT NULL, `ledger_entry_id` integer NOT NULL);
--> statement-breakpoint
INSERT INTO `_checks_ledger_link` (`check_id`, `ledger_entry_id`)
SELECT `id`, `ledger_entry_id` FROM `checks` WHERE `ledger_entry_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `checks` SET `ledger_entry_id` = NULL;
--> statement-breakpoint

-- 6. La table reconstruite.
CREATE TABLE `ledger_entries_rebuilt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`type` text NOT NULL,
	`account_id` integer NOT NULL,
	`transfer_id` integer,
	`transfer_leg` text,
	`category_id` integer,
	`amount_cents` integer NOT NULL,
	`date` text NOT NULL,
	`payment_method_id` integer NOT NULL,
	`description` text NOT NULL,
	`reference` text,
	`accrual_type` text DEFAULT 'normal' NOT NULL,
	`accrual_note` text,
	`member_id` integer,
	`bank_statement_line_id` integer,
	`invoice_id` integer,
	`status` text DEFAULT 'cleared' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`transfer_id`) REFERENCES `internal_transfers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bank_statement_line_id`) REFERENCES `bank_statement_lines`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action,
	-- Les colonnes sont citées **sans préfixe de table** : un CHECK qualifié par le nom de la
	-- table ne survit pas au `ALTER TABLE ... RENAME` qui suit (SQLite ne sait plus le résoudre).
	CONSTRAINT "ledger_entries_amount_cents_check" CHECK("amount_cents" > 0),
	CONSTRAINT "ledger_entries_transfert_check" CHECK(("type" = 'transfert' AND "transfer_id" IS NOT NULL AND "transfer_leg" IN ('source', 'destination') AND "category_id" IS NULL) OR ("type" <> 'transfert' AND "transfer_id" IS NULL AND "transfer_leg" IS NULL))
);
--> statement-breakpoint

-- 6a. Tout ce qui n'est pas un virement, à l'identique — y compris les écritures catégorisées
-- « Virements Internes » que l'appariement n'a pas retenues : elles attendent un arbitrage.
INSERT INTO `ledger_entries_rebuilt` (`id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT le.`id`, le.`season_id`, le.`type`, le.`account_id`, NULL, NULL, le.`category_id`, le.`amount_cents`, le.`date`, le.`payment_method_id`, le.`description`, le.`reference`, le.`accrual_type`, le.`accrual_note`, le.`member_id`, le.`bank_statement_line_id`, le.`invoice_id`, le.`status`, le.`created_at`
FROM `ledger_entries` le
WHERE le.`type` <> 'transfert'
  AND le.`id` NOT IN (SELECT `debit_id` FROM `_vi_pairs`)
  AND le.`id` NOT IN (SELECT `credit_id` FROM `_vi_pairs`);
--> statement-breakpoint

-- 6b. Population 1, jambe source : garde son identifiant et son pointage.
INSERT INTO `ledger_entries_rebuilt` (`id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT le.`id`, le.`season_id`, 'transfert', le.`account_id`,
       (SELECT it.`id` FROM `internal_transfers` it WHERE it.`reference` = 'VIR-T' || le.`id`),
       'source', NULL, le.`amount_cents`, le.`date`,
       (SELECT pm.`id` FROM `payment_methods` pm WHERE pm.`code` = 'virement_interne'),
       le.`description`, le.`reference`, 'normal', le.`accrual_note`, le.`member_id`,
       le.`bank_statement_line_id`, le.`invoice_id`, le.`status`, le.`created_at`
FROM `ledger_entries` le WHERE le.`type` = 'transfert';
--> statement-breakpoint

-- 6c. Population 1, jambe destinataire : elle n'existait pas, elle naît ici.
INSERT INTO `ledger_entries_rebuilt` (`season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT le.`season_id`, 'transfert', le.`destination_account_id`,
       (SELECT it.`id` FROM `internal_transfers` it WHERE it.`reference` = 'VIR-T' || le.`id`),
       'destination', NULL, le.`amount_cents`, le.`date`,
       (SELECT pm.`id` FROM `payment_methods` pm WHERE pm.`code` = 'virement_interne'),
       le.`description`, le.`reference`, 'normal', NULL, NULL, NULL, NULL, le.`status`, le.`created_at`
FROM `ledger_entries` le WHERE le.`type` = 'transfert';
--> statement-breakpoint

-- 6d/6e. Population 2 : chaque jambe garde son identifiant, sa date, son statut **et son
-- pointage**. C'est la population la mieux rapprochée du lot — c'était tout l'intérêt du
-- contournement — et la conversion ne doit rien lui reprendre.
INSERT INTO `ledger_entries_rebuilt` (`id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT d.`id`, d.`season_id`, 'transfert', d.`account_id`,
       (SELECT it.`id` FROM `internal_transfers` it WHERE it.`reference` = 'VIR-P' || p.`debit_id`),
       'source', NULL, d.`amount_cents`, d.`date`,
       (SELECT pm.`id` FROM `payment_methods` pm WHERE pm.`code` = 'virement_interne'),
       d.`description`, d.`reference`, 'normal', d.`accrual_note`, d.`member_id`,
       d.`bank_statement_line_id`, d.`invoice_id`, d.`status`, d.`created_at`
FROM `_vi_pairs` p JOIN `ledger_entries` d ON d.`id` = p.`debit_id`;
--> statement-breakpoint
INSERT INTO `ledger_entries_rebuilt` (`id`, `season_id`, `type`, `account_id`, `transfer_id`, `transfer_leg`, `category_id`, `amount_cents`, `date`, `payment_method_id`, `description`, `reference`, `accrual_type`, `accrual_note`, `member_id`, `bank_statement_line_id`, `invoice_id`, `status`, `created_at`)
SELECT c.`id`, c.`season_id`, 'transfert', c.`account_id`,
       (SELECT it.`id` FROM `internal_transfers` it WHERE it.`reference` = 'VIR-P' || p.`debit_id`),
       'destination', NULL, c.`amount_cents`, c.`date`,
       (SELECT pm.`id` FROM `payment_methods` pm WHERE pm.`code` = 'virement_interne'),
       c.`description`, c.`reference`, 'normal', c.`accrual_note`, c.`member_id`,
       c.`bank_statement_line_id`, c.`invoice_id`, c.`status`, c.`created_at`
FROM `_vi_pairs` p JOIN `ledger_entries` c ON c.`id` = p.`credit_id`;
--> statement-breakpoint

-- 7. Bascule.
DROP TABLE `ledger_entries`;
--> statement-breakpoint
ALTER TABLE `ledger_entries_rebuilt` RENAME TO `ledger_entries`;
--> statement-breakpoint

-- « Au plus une jambe de chaque sens par virement », rendu structurellement vrai. Que la paire
-- soit **complète** et de montants égaux reste gardé en applicatif, et vérifié par
-- `check-schema-integrity.js` : SQLite ne sait pas contraindre une table depuis une autre.
CREATE UNIQUE INDEX `internal_transfer_leg_idx` ON `ledger_entries` (`transfer_id`,`transfer_leg`);
--> statement-breakpoint

-- 8. Rétablissement du lien des chèques, et ménage.
UPDATE `checks` SET `ledger_entry_id` = (SELECT l.`ledger_entry_id` FROM `_checks_ledger_link` l WHERE l.`check_id` = `checks`.`id`)
WHERE `id` IN (SELECT `check_id` FROM `_checks_ledger_link`);
--> statement-breakpoint
DROP TABLE `_checks_ledger_link`;
--> statement-breakpoint
DROP TABLE `_vi_pairs`;
--> statement-breakpoint
DROP TABLE `_vi_candidates`;
--> statement-breakpoint

-- 9. La catégorie n'a plus d'objet. On ne la supprime pas : des écritures non appariées peuvent
-- encore la porter, et `check-schema-integrity.js` les surveillera jusqu'à leur arbitrage.
UPDATE `categories` SET `active` = 0 WHERE lower(`admin_label`) LIKE '%virement%interne%';
