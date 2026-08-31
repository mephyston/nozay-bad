-- Deux index de lecture, mesurés sur l'analytique D1 des 24 h du 30/08/2026.
--
-- Suite de `0026_index_de_lecture` : celui-là avait donné un chemin d'accès aux trois
-- requêtes les plus lourdes, ces deux-ci prennent les suivantes.

-- Les charges et produits constatés d'avance d'une période.
--
-- `get-season-reports/repository.ts:getDeferredTransactions` filtre sur un intervalle de
-- dates **et** sur `accrual_type`. Seule la date était indexée : SQLite lisait les 622
-- écritures de la période puis écartait `accrual_type` en mémoire, pour n'en retenir
-- qu'une poignée — les régularisations sont rares par nature. Mesuré : 20 526 lignes
-- lues pour 33 exécutions, soit 7,4 % de toutes les lectures de la production.
--
-- `accrual_type` en tête, et non la date : c'est la colonne sélective des deux, puisque
-- la quasi-totalité des écritures valent `normal`. La date en seconde position sert
-- ensuite l'intervalle sans relire les lignes.
CREATE INDEX IF NOT EXISTS `ledger_entries_accrual_date_idx` ON `ledger_entries` (`accrual_type`, `date`);--> statement-breakpoint

-- Les lignes de relevé d'une période, les plus récentes d'abord.
--
-- `bank_statement_lines` n'avait d'index que `(account_id, date)`, dont la colonne de
-- tête ne sert pas un filtre qui ne porte que sur les dates — et l'écran de
-- rapprochement en pose un tel, délibérément : une ligne de relevé n'appartient à aucun
-- exercice, et la file les veut tous comptes confondus. La requête balayait donc la
-- table entière puis triait : 77 220 lignes lues pour 65 exécutions.
--
-- L'ordre de l'index est celui du tri de la file (`date` puis `id`, décroissants) : c'est
-- ce qui permet à une page de vingt lignes de n'en lire que vingt, au lieu de toutes les
-- lire pour les trier ensuite.
CREATE INDEX IF NOT EXISTS `bank_statement_lines_date_id_idx` ON `bank_statement_lines` (`date`, `id`);
