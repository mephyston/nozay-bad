# Spécification Technique : Simplification UX du Rapprochement Bancaire

Ce document spécifie le design, l'architecture et les exigences pour la simplification de l'interface utilisateur (UX) du rapprochement bancaire par la suppression des filtres intelligents obsolètes ("Tout", "Évidences", "Récurrents").

## 1. Objectifs UX

* **Élimination de la surcharge cognitive** : Retrait de la seconde barre d'onglets de filtrage intelligent qui alourdit inutilement l'interface de gauche.
* **Maintien des onglets de statut** : Conservation des onglets principaux Shadcn Svelte (`À rapprocher`, `Rapprochées`, `Ignorées`) pour la gestion des workflows.

## 2. Simplification du Code

Les modifications de code suivantes seront appliquées :
* **TransactionLedger.svelte** : Sans changement.
* **BankStatementReconciliation.svelte** :
  * Retrait de `smartFilter` ($state) et `isRecurrentTx()` (helper).
  * Simplification de l'effet de reset `$effect` pour ne tracker que `activeTab`.
  * Simplification du filtre `displayedTransactions` ($derived).
  * Suppression du bloc HTML `<Tabs.Root>` conditionnel lié à `smartFilter` dans la liste de gauche.

## 3. Stratégie de Test

La suite de tests unitaires `BankStatementReconciliation.test.ts` sera nettoyée :
* Suppression complète du test unitaire `filters bank transactions using smart filter tabs (Tout, Évidences, Récurrents)`.
* Exécution globale de tous les tests restants pour valider la non-régression.
