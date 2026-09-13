-- Les comptes de trésorerie et les moyens de paiement se règlent depuis l'administration.
--
-- Les comptes naissaient par migration et se reconnaissaient à leur code écrit dans le
-- code (`current`, `cash`, `badnet`) ; les moyens de paiement étaient une liste figée,
-- recopiée dans le validateur du grand livre et dans la boutique. Un club qui ouvre un
-- second compte courant, ferme sa caisse ou n'a jamais eu de chèques LABAZ ne pouvait rien
-- y faire.
--
-- `accounts.kind` dit ce qu'est le compte — c'est désormais la nature, et non le code, qui
-- décide de ce que l'application en fait : un compte `bank` se rapproche par relevé, un
-- `cash` a son écran de caisse, un `wallet` (porte-monnaie Badnet) le sien, un
-- `third_party` (compte d'attente des adhérents) est une dette hors trésorerie.
-- `accounts.active` retire un compte des menus et des formulaires sans le supprimer : les
-- écritures y renvoient. `accounts.statement_account_number` est le numéro que la banque
-- écrit dans ses relevés (`<ACCTID>` en OFX) : c'est lui qui dit à l'import sur quel compte
-- une ligne atterrit — jusqu'ici, un numéro écrit dans le code désignait le livret.
--
-- `payment_methods.kind` porte de même le comportement (un `transfer` affiche l'IBAN, un
-- `cash` se remet en main propre) ; `active` retire le moyen de tous les formulaires,
-- `storefront` de la seule boutique des adhérents. `internal` est le virement entre comptes,
-- technique, jamais proposé.
--
-- Migration strictement additive : l'ancien code ignore ces colonnes, et leurs défauts
-- reproduisent le comportement d'avant.
ALTER TABLE `accounts` ADD `kind` text DEFAULT 'bank' NOT NULL;
--> statement-breakpoint
ALTER TABLE `accounts` ADD `active` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `accounts` ADD `statement_account_number` text;
--> statement-breakpoint
UPDATE `accounts` SET `statement_account_number` = '00070007847' WHERE `code` = 'savings';
--> statement-breakpoint
UPDATE `accounts` SET `kind` = 'cash' WHERE `code` = 'cash';
--> statement-breakpoint
UPDATE `accounts` SET `kind` = 'wallet' WHERE `code` = 'badnet';
--> statement-breakpoint
UPDATE `accounts` SET `kind` = 'third_party' WHERE `code` = 'member_advances';
--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `kind` text DEFAULT 'transfer' NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `active` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `payment_methods` ADD `storefront` integer DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE `payment_methods` SET `kind` = 'cheque' WHERE `code` = 'cheque';
--> statement-breakpoint
UPDATE `payment_methods` SET `kind` = 'cash' WHERE `code` = 'especes';
--> statement-breakpoint
UPDATE `payment_methods` SET `kind` = 'card', `storefront` = 0 WHERE `code` = 'cb';
--> statement-breakpoint
UPDATE `payment_methods` SET `kind` = 'voucher' WHERE `code` IN ('labaz', 'ancv', 'pass_sport', 'ticket_loisir', 'up_loisir');
--> statement-breakpoint
UPDATE `payment_methods` SET `kind` = 'internal', `storefront` = 0 WHERE `code` = 'virement_interne';
