# Spécification de Conception : Validation TypeBox des Routes Accounting

Ce document décrit l'implémentation de la validation de schémas d'entrée au niveau des routes Hono pour le domaine `accounting`.

## Objectifs et Besoins

1. **Sécuriser les endpoints de l'API** : Empêcher le passage de requêtes mal formées ou de types erronés aux handlers applicatifs.
2. **Standardiser l'architecture VSA** : Implémenter le pattern existant dans `shop/create-order/route.ts` en utilisant `@hono/typebox-validator` et `@sinclair/typebox`.
3. **Corriger et enforcer la règle ESLint** : Faire en sorte que la règle bannissant `drizzle-orm` (hors instanciation du client via `drizzle-orm/d1`) s'applique effectivement à tous les fichiers `route.ts`.
4. **Valider par les tests** : Ajouter des tests unitaires de routes (`route.test.ts`) pour chaque validateur créé.

## Changements Proposés

### 1. Règle ESLint (`eslint.config.js`)
- Corriger le masque `files` pour inclure `**/route.ts`.
- Remplacer le bloc `paths` restreignant `drizzle-orm` par un bloc `patterns` restreignant `drizzle-orm` et ses sous-chemins, tout en autorisant spécifiquement `drizzle-orm/d1` via `!drizzle-orm/d1` pour permettre l'instanciation de `drizzle(c.env.DB)`.

### 2. Validateurs TypeBox (`validator.ts`)
Création d'un fichier `validator.ts` dans chacune des 16 slices de commandes du domaine `accounting`. Les types de schémas sont calqués sur les DTO de chaque slice :
1. `change-invoice-status`
2. `create-account-class`
3. `create-bank-check-deposit`
4. `create-category`
5. `create-invoice`
6. `create-season`
7. `create-transaction`
8. `reconcile-bank-transaction`
9. `record-check-transaction`
10. `update-account-class`
11. `update-category`
12. `update-invoice`
13. `update-season-balances`
14. `update-season-budget`
15. `update-season`
16. `update-transaction`

De plus, des schémas de query-params simples seront ajoutés pour les requêtes avec des paramètres obligatoires :
- `queries/list-bank-transactions`
- `queries/list-checks`
- `queries/list-invoices`
- `commands/analyze-bank-transactions`

### 3. Routes Hono (`route.ts`)
- Import de `tbValidator` et du schéma.
- Ajout du middleware `tbValidator('json', schema, callback)` ou `tbValidator('query', schema, callback)`.
- Remplacement des appels `await c.req.json()` par `c.req.valid('json')`.

### 4. Validation par les Tests (`route.test.ts`)
Ajout d'un fichier `route.test.ts` dans chaque slice modifiée pour tester :
- Échec de la validation (Statut 400).
- Réussite de la validation (Statut 200).

## Plan de Validation
- Lancement de `npx eslint .` pour s'assurer du respect des règles d'import.
- Lancement de `npx vitest run libs/domains/accounting` pour vérifier que tous les tests passent.
