# Plan d'Implémentation : Typage Strict Drizzle / D1 et Élimination de `db: any`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remplacer les 192+ occurrences de `db: any`, `tx: any` et `any` résiduels dans les domaines par les types stricts Drizzle `Db`, `Tx` et `DbOrTx` introduits dans `@nba/db`.

**Tech Stack:** TypeScript, Drizzle ORM (`drizzle-orm/d1`), Cloudflare Workers (D1), Hono, Vitest.

---

### Task 1: Module Client Partagé `@nba/db`

**Files:**
- Create: `libs/shared/db/src/client.ts`
- Modify: `libs/shared/db/src/index.ts`

- [ ] **Step 1: Créer `libs/shared/db/src/client.ts`**
```typescript
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';

export type Db = DrizzleD1Database;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type DbOrTx = Db | Tx;

export const createDb = (d1: D1Database): Db => drizzle(d1);
```

- [ ] **Step 2: Mettre à jour `libs/shared/db/src/index.ts`**
```typescript
export * from './client';
export * from './errors';
```

- [ ] **Step 3: Vérifier le typage de `@nba/db`**
Run: `npx tsc --noEmit`

- [ ] **Step 4: Commiter le changement**
Run: `git commit -am "feat(shared-db): add Db, Tx, DbOrTx types and createDb helper"`

---

### Task 2: Domaine `members`

**Files:**
- Modify: `libs/domains/members/apply-payment/handler.ts`
- Modify: `libs/domains/members/apply-payment/repository.ts`
- Modify: `libs/domains/members/get-member-by-licence/handler.ts`
- Modify: `libs/domains/members/get-member-by-licence/repository.ts`
- Modify: `libs/domains/members/get-member-cse-data/handler.ts`
- Modify: `libs/domains/members/get-member-cse-data/repository.ts`
- Modify: `libs/domains/members/import-members-csv/handler.ts`
- Modify: `libs/domains/members/import-members-csv/repository.ts`
- Modify: `libs/domains/members/import-members-csv/route.ts`
- Modify: `libs/domains/members/list-members/handler.ts`
- Modify: `libs/domains/members/list-members/repository.ts`
- Modify: `libs/domains/members/shared/queries.ts`

- [ ] **Step 1: Remplacer `db: any` par `Db` / `DbOrTx` dans tout le domaine `members`**
- [ ] **Step 2: Remplacer `drizzle(c.env.DB)` par `createDb(c.env.DB)` dans `import-members-csv/route.ts`**
- [ ] **Step 3: Typer les retours de fonctions repositories et DTOs avec `$inferSelect` / `$inferInsert`**
- [ ] **Step 4: Valider `members`**
Run: `npx tsc --noEmit`
Run: `npx vitest run libs/domains/members`
- [ ] **Step 5: Commiter `members`**
Run: `git commit -am "refactor(members): strict drizzle typing for db and repositories"`

---

### Task 3: Domaine `expenses`

**Files:**
- Modify: `libs/domains/expenses/**`

- [ ] **Step 1: Remplacer `db: any` par `Db` / `DbOrTx` dans tout le domaine `expenses`**
- [ ] **Step 2: Remplacer `drizzle(c.env.DB)` par `createDb(c.env.DB)` dans les `route.ts` de `expenses`**
- [ ] **Step 3: Typer les retours et inserts**
- [ ] **Step 4: Valider `expenses`**
Run: `npx tsc --noEmit`
Run: `npx vitest run libs/domains/expenses`
- [ ] **Step 5: Commiter `expenses`**
Run: `git commit -am "refactor(expenses): strict drizzle typing for db and repositories"`

---

### Task 4: Domaine `shop`

**Files:**
- Modify: `libs/domains/shop/**`

- [ ] **Step 1: Remplacer `db: any` par `Db` / `DbOrTx` dans tout le domaine `shop`**
- [ ] **Step 2: Remplacer `drizzle(c.env.DB)` par `createDb(c.env.DB)` dans les `route.ts` de `shop`**
- [ ] **Step 3: Typer les retours et inserts**
- [ ] **Step 4: Valider `shop`**
Run: `npx tsc --noEmit`
Run: `npx vitest run libs/domains/shop`
- [ ] **Step 5: Commiter `shop`**
Run: `git commit -am "refactor(shop): strict drizzle typing for db and repositories"`

---

### Task 5: Domaine `accounting`

**Files:**
- Modify: `libs/domains/accounting/**`

- [ ] **Step 1: Remplacer `db: any` par `Db` / `DbOrTx` dans tout le domaine `accounting`**
- [ ] **Step 2: Remplacer `drizzle(c.env.DB)` par `createDb(c.env.DB)` dans les `route.ts` de `accounting`**
- [ ] **Step 3: Typer les retours, DTOs et inserts**
- [ ] **Step 4: Valider `accounting`**
Run: `npx tsc --noEmit`
Run: `npx vitest run libs/domains/accounting`
- [ ] **Step 5: Commiter `accounting`**
Run: `git commit -am "refactor(accounting): strict drizzle typing for db and repositories"`

---

### Task 6: Vérification Globale Finale

- [ ] **Step 1: Vérifier la disparition complète de `db: any`**
Run: `grep -rn "db: any\|txDb: any" libs/domains --include="*.ts" | grep -v test` (Devrait renvoyer 0)
- [ ] **Step 2: Vérifier les `any` résiduels**
Run: `grep -rn ": any\b" libs/domains --include="*.ts" | grep -v test | wc -l` (Devrait être < 30)
- [ ] **Step 3: Exécuter Typecheck et Vitest globalement**
Run: `npx tsc --noEmit -p tsconfig.json`
Run: `npx vitest run`
