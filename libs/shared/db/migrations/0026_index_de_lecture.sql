-- Index de lecture : supprimer les balayages complets des trois tables les plus lues.
--
-- Mesuré sur la production (analytique D1, 24 h) : la liste des adhérents lisait 538
-- lignes par appel — la table entière — alors qu'elle est paginée à vingt ; l'agrégat
-- comptable en lisait 1 377 pour une somme par catégorie ; et un simple `MAX(date)` sur
-- les lignes de relevé en lisait 1 190 pour en rendre deux. Aucune de ces requêtes ne
-- pouvait s'appuyer sur un index : `memberships` n'en avait que sur `(person_id,
-- season_id)`, dont la colonne de tête ne sert pas un filtre par saison, et
-- `ledger_entries` n'en avait aucun hors la contrainte des virements.
--
-- Rien à changer côté code : ce sont les mêmes requêtes, avec un chemin d'accès.
CREATE INDEX IF NOT EXISTS `memberships_season_idx` ON `memberships` (`season_id`);--> statement-breakpoint

-- `season_id` et `date` séparément, et non en index composite : le grand livre filtre
-- « saison OU intervalle de dates » (`season_id = ? OR (date >= ? AND date <= ?)`), et
-- c'est l'optimisation par OR de SQLite qui joue — elle réunit deux index distincts,
-- là où un composite ne servirait que la première colonne.
CREATE INDEX IF NOT EXISTS `ledger_entries_season_idx` ON `ledger_entries` (`season_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `ledger_entries_date_idx` ON `ledger_entries` (`date`);--> statement-breakpoint

-- Le solde progressif parcourt les écritures d'un compte dans l'ordre des dates : c'est
-- exactement cet index qui évite d'en relire d'autres.
CREATE INDEX IF NOT EXISTS `ledger_entries_account_date_idx` ON `ledger_entries` (`account_id`, `date`);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS `bank_statement_lines_account_date_idx` ON `bank_statement_lines` (`account_id`, `date`);
