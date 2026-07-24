# Spécification Technique : Vertical Slice Architecture (VSA) Backend & Frontières Nx

Ce document définit l'architecture cible et la stratégie de migration du backend de l'application `nozay-bad` vers une architecture en tranches verticales (Vertical Slice Architecture) et l'enforcement des frontières de modules via Nx.

## 1. Objectifs
- Découper le fichier de routes d'API principal [index.ts](file:///Users/david/Lab/nozay-bad/apps/api/src/index.ts) et le schéma de base de données unique [schema.ts](file:///Users/david/Lab/nozay-bad/libs/shared/db/src/schema.ts) en tranches fonctionnelles autonomes (Bounded Contexts).
- Enforcer la séparation stricte de ces tranches à l'aide du système de tags de Nx et de règles ESLint.
- Uniformiser le nommage de la base de données en anglais en traduisant les derniers champs hybrides (`codeRecette` et `codeDepense`).

---

## 2. Découpage Fonctionnel (Bounded Contexts)

Le code sera découpé en 4 domaines principaux et une section partagée (Shared) :

### A. Adhérents (`members`)
- **Responsabilités** : Gestion des fiches adhérents, imports depuis Poona, génération d'attestations CSE.
- **Tables de base de données** : `users`, `members`.
- **Bibliothèques Nx** :
  - `libs/features/members/data-access` (schémas, requêtes D1)
  - `libs/features/members/api` (routes Hono, validateurs de requêtes)

### B. Comptabilité (`accounting`)
- **Responsabilités** : Grand livre comptable, rapprochement bancaire, rapports d'assemblée générale (compte de résultat, prévisionnel), catégories comptables, classes de comptes, factures émises.
- **Tables de base de données** : `seasons`, `season_balances`, `transactions`, `bank_statement_lines`, `check_deposits`, `checks`, `categories`, `account_classes`, `season_category_budgets`, `invoices`, `invoice_items`.
- **Bibliothèques Nx** :
  - `libs/features/accounting/data-access`
  - `libs/features/accounting/api`

### C. Notes de frais (`expenses`)
- **Responsabilités** : Gestion des demandes de remboursement de frais des bénévoles.
- **Tables de base de données** : `expenses`.
- **Bibliothèques Nx** :
  - `libs/features/expenses/data-access`
  - `libs/features/expenses/api`

### D. Boutique (`shop`)
- **Responsabilités** : Catalogue des articles (raquettes, volants, cordages), suivi et historique des commandes.
- **Tables de base de données** : `products`, `orders`.
- **Bibliothèques Nx** :
  - `libs/features/shop/data-access`
  - `libs/features/shop/api`

### E. Partagé (`shared/db`)
- **Responsabilités** : Connexion client D1, configuration de base de Drizzle, migrations globales.
- **Bibliothèques Nx** :
  - `libs/shared/db`

---

## 3. Structure des Fichiers et Imports croisés

La structure de dossiers suivante sera créée pour chaque domaine :

```
libs/features/[domain]/
  data-access/
    project.json     --> Tags : ["scope:[domain]", "type:data-access"]
    tsconfig.json
    src/
      index.ts       --> Barrel file exportant le schéma et les requêtes Drizzle
      schema.ts      --> Définition des tables Drizzle du domaine
  api/
    project.json     --> Tags : ["scope:[domain]", "type:api"]
    tsconfig.json
    src/
      index.ts       --> Barrel file exportant le sous-routeur Hono
      routes.ts      --> Implémentation des routes d'API
```

### Règles d'Imports autorisés :
- `apps/api` importe uniquement les modules `api` de chaque feature (ex: `@nba/members-api`).
- Chaque feature `api` importe sa propre feature `data-access` (ex: `members/api` -> `members/data-access`).
- **Jointures SQL transversales** : `accounting/data-access` est autorisé à importer `members/data-access` (pour les jointures SQL entre `transactions` et `members`), mais `accounting/api` ne peut jamais importer directement `members/api` ou `members/data-access`.

---

## 4. Renommage des colonnes en Anglais

Dans le cadre de l'uniformisation linguistique de la base de données, la table `categories` subira les modifications suivantes :

| Ancien nom (TypeScript) | Nouveau nom (TypeScript) | Nom de colonne SQL |
| :--- | :--- | :--- |
| `codeRecette` | `receiptCode` | `receipt_code` |
| `codeDepense` | `expenseCode` | `expense_code` |

Une migration Drizzle Kit SQL de renommage (`RENAME COLUMN`) sera générée et jouée pour conserver les données de production intactes. Toutes les références dans le frontend (fichiers Svelte et Astro) et le backend (validations, API) seront adaptées.

---

## 5. Enforcement des frontières Nx via ESLint

Un fichier `eslint.config.js` racine sera mis en place pour garantir le respect de l'architecture.

### Configuration des Règles `@nx/enforce-module-boundaries` :
```javascript
{
  rules: {
    '@nx/enforce-module-boundaries': [
      'error',
      {
        enforceBuildableLibDependency: true,
        allow: [],
        depConstraints: [
          // Les applications peuvent dépendre des APIs
          {
            sourceTag: 'type:app',
            onlyDependOnLibsWithTags: ['type:api', 'type:ui', 'scope:shared']
          },
          // L'API d'une feature dépend de sa couche d'accès aux données
          {
            sourceTag: 'type:api',
            onlyDependOnLibsWithTags: ['type:data-access', 'scope:shared']
          },
          // Couches d'accès aux données : isolation par défaut, sauf compta vers membres pour les jointures SQL
          {
            sourceTag: 'scope:accounting',
            onlyDependOnLibsWithTags: ['scope:accounting', 'scope:members', 'scope:shared']
          },
          {
            sourceTag: 'scope:members',
            onlyDependOnLibsWithTags: ['scope:members', 'scope:shared']
          },
          {
            sourceTag: 'scope:expenses',
            onlyDependOnLibsWithTags: ['scope:expenses', 'scope:shared']
          },
          {
            sourceTag: 'scope:shop',
            onlyDependOnLibsWithTags: ['scope:shop', 'scope:shared']
          }
        ]
      }
    ]
  }
}
```

---

## 6. Plan de Migration et Phase de Transition
1. Création des configurations Nx (`project.json` des applications existantes).
2. Création progressive des sous-bibliothèques Nx pour chaque domaine.
3. Découpage du fichier de schéma Drizzle unique en schémas par domaine.
4. Modification de `drizzle.config.ts` pour supporter la collecte glob des schémas.
5. Génération de la migration SQL pour le renommage de `codeRecette` et `codeDepense`.
6. Extraction et découpage des routes de `apps/api/src/index.ts` vers les routeurs de domaine.
7. Mise en place d'ESLint racine et exécution de `nx lint` pour validation.
8. Lancement de la suite complète de 128 tests vitest pour valider l'intégrité fonctionnelle.
