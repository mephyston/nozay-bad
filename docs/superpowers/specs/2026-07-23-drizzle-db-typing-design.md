# Spécification de Conception : Typage Strict Drizzle / D1 et Élimination de `db: any`

Ce document décrit la refactorisation globale du typage Drizzle ORM sur Cloudflare D1 à travers le monorepo, remplaçant toutes les occurrences de `db: any`, `tx: any` et `any` résiduels par des types fortement typés.

## Objectifs et Périmètre

1. **Création/Complétude du module partagé `@nba/db`** :
   Exposer les types `Db`, `Tx`, `DbOrTx` et la factory `createDb`.
2. **Remplacement de `drizzle(c.env.DB)` dans les routes** :
   Utiliser `createDb(c.env.DB)` dans tous les fichiers `route.ts`.
3. **Refactorisation domaine par domaine** dans l'ordre strict :
   - `members`
   - `expenses`
   - `shop`
   - `accounting`
4. **Typage strict des repositories et handlers** :
   - Handlers applicatifs : `db: Db`
   - Repositories & callbacks transactionnels : `db: DbOrTx`, transactions `tx: Tx`
   - Types de retour des repositories : inférés via Drizzle (`$inferSelect`) ou DTOs explicites.
   - Insertions : `$inferInsert` ou `Omit<..., 'id'>`.
5. **Types DTO** : Remplacer `export type XxxOutput = any` par les types d'API réels.

## Spécification Technique du Module `@nba/db`

Structure de `libs/shared/db/src/client.ts` :

```typescript
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

export type Db = DrizzleD1Database;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

export const createDb = (d1: D1Database): Db => drizzle(d1);
```

Et dans `libs/shared/db/src/index.ts` :
```typescript
export * from './client';
export * from './errors';
```

## Stratégie par Domaine

### 1. Domaine `members`
- Mettre à jour `apply-payment`, `get-member-by-licence`, `get-member-cse-data`, `import-members-csv`, `list-members`, et `shared/queries.ts`.
- Typer les retours de `membersTable` via `$inferSelect`.

### 2. Domaine `expenses`
- Mettre à jour `create`, `list`, `update-status` et leurs repositories.
- Typer les retours de `expensesTable` via `$inferSelect`.

### 3. Domaine `shop`
- Mettre à jour `create-order`, `list-products`, `list-orders`, `update-product`, `cancel-order` et leurs repositories.
- Typer les retours des tables `productsTable`, `ordersTable`, `orderItemsTable`.

### 4. Domaine `accounting`
- Mettre à jour toutes les tranches (commands et queries).
- Adapter les 36 slices de `accounting` pour utiliser `Db` et `DbOrTx`.

## Critères d'Acceptation et Validation
1. `grep -rn "db: any\|txDb: any" libs/domains --include="*.ts" | grep -v test` -> 0 résultat.
2. `grep -rn ": any\b" libs/domains --include="*.ts" | grep -v test | wc -l` < 30.
3. `npx tsc --noEmit` passe sans aucune erreur.
4. `npx vitest run` passe à 100%.
