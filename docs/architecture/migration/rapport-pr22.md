# Rapport de PR — PR22 — Nettoyer le contournement de transaction imbriquée

## Modifications apportées
1. Remplacement de la détection de transaction imbriquée par `catch (err) { if (err.message.includes('begin')) ... }` dans `libs/domains/accounting/commands/reconcile-bank-transaction/handler.ts` par une vérification explicite et orientée objet avec `db instanceof SQLiteTransaction` de `drizzle-orm/sqlite-core`.
2. Les méthodes `reconcileBankTransaction` et `reconcileBulkTransactions` vérifient si l'objet `db` fourni en entrée est déjà une transaction active. Si oui, elles exécutent l'action directement sans tenter de recréer une transaction imbriquée. Sinon, elles créent la transaction englobante.
3. Élimination complète de toute détection basée sur l'analyse textuelle du message d'erreur.

## Sortie des Tests Exécutés

```
 RUN  v4.1.10 /Users/david/Lab/nozay-bad

 ✓  features-accounting-ui  ../reports/ui/GeneralMeetingReport.test.ts (3 tests) 114ms
 ✓  features-accounting-ui  ../seasons/ui/InitialBalancesConfig.test.ts (2 tests) 36ms
 ✓  features-accounting-ui  ../cash-box/ui/CashBoxManager.test.ts (2 tests) 62ms
 ✓  features-accounting-ui  ../seasons/ui/SettingsManager.test.ts (3 tests) 101ms
 ✓  features-accounting-ui  ../queries/list-invoices/ui/InvoicesManager.test.ts (2 tests) 106ms
 ✓  features-accounting-ui  ../checks/ui/CheckDepositManager.test.ts (3 tests) 124ms
 ✓  features-accounting-ui  ../transactions/ui/TransactionLedger.test.ts (4 tests) 194ms
 ✓  features-accounting-ui  ../commands/reconcile-bank-transaction/ui/BankStatementReconciliation.test.ts (12 tests) 526ms

 Test Files  8 passed (8)
      Tests  31 passed (31)
```

```
 RUN  v4.1.10 /Users/david/Lab/nozay-bad

 ✓  features-accounting-api  src/helpers.test.ts (3 tests) 2ms
 ✓  features-accounting-api  src/routes.test.ts (51 tests) 276ms

 Test Files  2 passed (2)
      Tests  54 passed (54)
```
