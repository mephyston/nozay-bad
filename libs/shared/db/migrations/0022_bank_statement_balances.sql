-- Le solde arrêté par la banque, que le fichier OFX portait déjà et qu'on jetait.
--
-- `parseOFX` ne lisait que les blocs `<STMTTRN>` — les mouvements. Le bloc `<LEDGERBAL>`,
-- qui donne le solde du compte à une date (`<DTASOF>`), partait à la poubelle. Conséquence :
-- on savait pointer une opération contre une écriture, mais on ne pouvait pas boucler un
-- état de rapprochement, faute d'un nombre venu de l'extérieur auquel confronter les livres.
--
-- Le trou était d'ailleurs déjà repéré dans le code : `close-season/handler.ts` portait un
-- `if` vide commenté « In full bank reconciliation, final bank balance is tracked ».
--
-- Migration strictement additive : la version qui la porte reste rollbackable, l'ancien code
-- ignorant simplement cette table. Elle n'accorde aucun droit — la lecture de l'état de
-- rapprochement retombe sur `accounting:bank:read`, qui existe déjà.

CREATE TABLE `bank_statement_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`date` text NOT NULL,
	`balance_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_statement_balance_account_date_idx` ON `bank_statement_balances` (`account_id`,`date`);