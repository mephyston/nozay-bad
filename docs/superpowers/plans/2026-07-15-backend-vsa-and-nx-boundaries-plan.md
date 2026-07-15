# Backend VSA & Nx Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the backend codebase into isolated functional vertical slices (VSA) and enforce strict module boundaries using Nx tags and ESLint constraints.

**Architecture:** Split the monolithic Drizzle database schemas and Hono API routes into feature libraries under `libs/features/[domain]/data-access` and `libs/features/[domain]/api`. Enforce architectural dependencies using root ESLint `@nx/enforce-module-boundaries` rules, and run drizzle-kit to migrate SQLite fields to English.

**Tech Stack:** Nx Monorepo, Hono API, Drizzle ORM, D1 SQLite Database, ESLint, TypeScript, Vitest.

## Global Constraints
- Use library versions already present in the monorepo.
- All unit and integration tests must run and pass using Vitest.
- All TypeScript files must compile without errors under `npx astro check`.
- Database table columns `codeRecette` and `codeDepense` must be renamed to `receiptCode` and `expenseCode` using a backwards-compatible SQL migration.

---

## Tasks

### Task 1: Initialize Nx Configuration & Project Metadata
**Files:**
- Create: `apps/api/project.json`
- Create: `apps/admin-console/project.json`
- Create: `apps/boutique/project.json`
- Create: `libs/shared/db/project.json`
- Create: `eslint.config.js`

**Interfaces:**
- Consumes: None (workspace-wide setup).
- Produces: Tags assigned to existing packages for module boundary enforcement.

- [ ] **Step 1: Create apps/api/project.json**
  Write configuration with tags:
  ```json
  {
    "name": "api",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "projectType": "application",
    "sourceRoot": "apps/api/src",
    "tags": ["type:app", "scope:api"]
  }
  ```

- [ ] **Step 2: Create apps/admin-console/project.json**
  Write configuration:
  ```json
  {
    "name": "admin-console",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "projectType": "application",
    "sourceRoot": "apps/admin-console/src",
    "tags": ["type:app", "scope:admin-console"]
  }
  ```

- [ ] **Step 3: Create apps/boutique/project.json**
  Write configuration:
  ```json
  {
    "name": "boutique",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "projectType": "application",
    "sourceRoot": "apps/boutique/src",
    "tags": ["type:app", "scope:boutique"]
  }
  ```

- [ ] **Step 4: Create libs/shared/db/project.json**
  Write configuration:
  ```json
  {
    "name": "@metacult/shared-db",
    "$schema": "../../../node_modules/nx/schemas/project-schema.json",
    "projectType": "library",
    "sourceRoot": "libs/shared/db/src",
    "tags": ["type:data-access", "scope:shared"]
  }
  ```

- [ ] **Step 5: Create root eslint.config.js**
  Write configurations for Nx boundaries rule:
  ```javascript
  import nxPlugin from '@nx/eslint-plugin';

  export default [
    {
      plugins: {
        '@nx': nxPlugin,
      },
      rules: {
        '@nx/enforce-module-boundaries': [
          'error',
          {
            enforceBuildableLibDependency: true,
            allow: [],
            depConstraints: [
              {
                sourceTag: 'type:app',
                onlyDependOnLibsWithTags: ['type:api', 'type:ui', 'scope:shared']
              },
              {
                sourceTag: 'type:api',
                onlyDependOnLibsWithTags: ['type:data-access', 'scope:shared']
              },
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
  ];
  ```

- [ ] **Step 6: Run Nx validation**
  Run: `npx nx show projects`
  Expected: Outputs `api`, `admin-console`, `boutique`, `@metacult/shared-db`.

- [ ] **Step 7: Commit changes**
  Run:
  ```bash
  git add apps/api/project.json apps/admin-console/project.json apps/boutique/project.json libs/shared/db/project.json eslint.config.js
  git commit -m "chore(nx): configure projects.json metadata and eslint boundary constraints"
  ```

---

### Task 2: Create VSA Feature Data-Access Libraries & Split DB Schema
**Files:**
- Create: `libs/features/members/data-access/project.json`
- Create: `libs/features/members/data-access/tsconfig.json`
- Create: `libs/features/members/data-access/src/schema.ts`
- Create: `libs/features/members/data-access/src/index.ts`
- Create: `libs/features/accounting/data-access/project.json`
- Create: `libs/features/accounting/data-access/tsconfig.json`
- Create: `libs/features/accounting/data-access/src/schema.ts`
- Create: `libs/features/accounting/data-access/src/index.ts`
- Create: `libs/features/expenses/data-access/project.json`
- Create: `libs/features/expenses/data-access/tsconfig.json`
- Create: `libs/features/expenses/data-access/src/schema.ts`
- Create: `libs/features/expenses/data-access/src/index.ts`
- Create: `libs/features/shop/data-access/project.json`
- Create: `libs/features/shop/data-access/tsconfig.json`
- Create: `libs/features/shop/data-access/src/schema.ts`
- Create: `libs/features/shop/data-access/src/index.ts`
- Modify: `libs/shared/db/drizzle.config.ts`
- Modify: `tsconfig.base.json`
- Delete: `libs/shared/db/src/schema.ts`

**Interfaces:**
- Consumes: Existing SQLite tables.
- Produces: Partitioned schemas accessible under domain alias paths.

- [ ] **Step 1: Create folders and project.json files**
  Create the folder tree and write respective `project.json` metadata for the 4 libraries:
  - `libs/features/members/data-access/project.json`:
    ```json
    {
      "name": "@metacult/features-members-data-access",
      "projectType": "library",
      "sourceRoot": "libs/features/members/data-access/src",
      "tags": ["type:data-access", "scope:members"]
    }
    ```
  - `libs/features/accounting/data-access/project.json`:
    ```json
    {
      "name": "@metacult/features-accounting-data-access",
      "projectType": "library",
      "sourceRoot": "libs/features/accounting/data-access/src",
      "tags": ["type:data-access", "scope:accounting"]
    }
    ```
  - `libs/features/expenses/data-access/project.json`:
    ```json
    {
      "name": "@metacult/features-expenses-data-access",
      "projectType": "library",
      "sourceRoot": "libs/features/expenses/data-access/src",
      "tags": ["type:data-access", "scope:expenses"]
    }
    ```
  - `libs/features/shop/data-access/project.json`:
    ```json
    {
      "name": "@metacult/features-shop-data-access",
      "projectType": "library",
      "sourceRoot": "libs/features/shop/data-access/src",
      "tags": ["type:data-access", "scope:shop"]
    }
    ```

- [ ] **Step 2: Add aliases in tsconfig.base.json**
  Append path definitions in `tsconfig.base.json`:
  ```json
  "paths": {
    "@metacult/shared-db": ["libs/shared/db/src/index.ts"],
    "@metacult/features-members-data-access": ["libs/features/members/data-access/src/index.ts"],
    "@metacult/features-accounting-data-access": ["libs/features/accounting/data-access/src/index.ts"],
    "@metacult/features-expenses-data-access": ["libs/features/expenses/data-access/src/index.ts"],
    "@metacult/features-shop-data-access": ["libs/features/shop/data-access/src/index.ts"]
  }
  ```

- [ ] **Step 3: Write Schema splits and barrel files**
  Create local schema files, exporting tables:
  - `libs/features/members/data-access/src/schema.ts` (write `usersTable`, `membersTable` declarations)
  - `libs/features/members/data-access/src/index.ts`:
    ```typescript
    export * from './schema';
    ```
  - `libs/features/accounting/data-access/src/schema.ts` (write `seasonsTable`, `seasonBalancesTable`, `transactionsTable`, `bankTransactionsTable`, `checkDepositsTable`, `checksTable`, `categoriesTable`, `accountClassesTable`, `seasonCategoryBudgetsTable`, `invoicesTable`, `invoiceItemsTable` declarations, importing `membersTable` from members schema for foreign keys)
  - `libs/features/accounting/data-access/src/index.ts`:
    ```typescript
    export * from './schema';
    ```
  - `libs/features/expenses/data-access/src/schema.ts` (write `expensesTable`)
  - `libs/features/expenses/data-access/src/index.ts`:
    ```typescript
    export * from './schema';
    ```
  - `libs/features/shop/data-access/src/schema.ts` (write `productsTable`, `ordersTable`)
  - `libs/features/shop/data-access/src/index.ts`:
    ```typescript
    export * from './schema';
    ```

- [ ] **Step 4: Update drizzle.config.ts**
  Modify `libs/shared/db/drizzle.config.ts` to locate split schemas via glob pattern:
  ```typescript
  import { defineConfig } from 'drizzle-kit';

  export default defineConfig({
    dialect: 'sqlite',
    schema: './libs/features/*/data-access/src/schema.ts',
    out: './libs/shared/db/migrations',
  });
  ```

- [ ] **Step 5: Clean original schema file**
  Delete `libs/shared/db/src/schema.ts`. In `libs/shared/db/src/index.ts`, re-export everything from the feature schemas so that existing build queries do not break:
  ```typescript
  export * from '../../../features/members/data-access/src/schema';
  export * from '../../../features/accounting/data-access/src/schema';
  export * from '../../../features/expenses/data-access/src/schema';
  export * from '../../../features/shop/data-access/src/schema';
  ```

- [ ] **Step 6: Verify workspace compilation**
  Run: `npx tsc --noEmit` and `npx vitest run`
  Expected: All tests pass.

- [ ] **Step 7: Commit changes**
  Run:
  ```bash
  git add libs/features tsconfig.base.json libs/shared/db/drizzle.config.ts libs/shared/db/src/index.ts
  git rm libs/shared/db/src/schema.ts
  git commit -m "feat(db): split database schema files into respective VSA domain libraries"
  ```

---

### Task 3: Rename categories table columns & generate Drizzle migration
**Files:**
- Modify: `libs/features/accounting/data-access/src/schema.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/admin-console/src/components/TransactionLedger.svelte`
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.svelte`
- Modify: `apps/admin-console/src/pages/admin/compta/import.astro`
- Modify: `apps/admin-console/src/pages/admin/compta/index.astro`
- Modify: `apps/admin-console/src/pages/admin/compta/reports.astro`

**Interfaces:**
- Consumes: DB Categories schema.
- Produces: Updated schema using `receiptCode` and `expenseCode` instead of French equivalents.

- [ ] **Step 1: Update Drizzle table schema**
  Modify columns in `libs/features/accounting/data-access/src/schema.ts`:
  ```typescript
  export const categoriesTable = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adminLabel: text('admin_label').notNull(),
    adherentLabel: text('adherent_label').notNull(),
    hideInExpenses: integer('hide_in_expenses', { mode: 'boolean' }).notNull().default(false),
    receiptCode: text('receipt_code'),
    expenseCode: text('expense_code'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull()
  });
  ```

- [ ] **Step 2: Generate Drizzle Kit schema migration**
  Run: `npx drizzle-kit generate`
  Expected: Generates a new SQL migration renaming columns `code_recette` -> `receipt_code` and `code_depense` -> `expense_code`.

- [ ] **Step 3: Update API references**
  Update all occurrences of `codeRecette` and `codeDepense` inside `apps/api/src/index.ts` to `receiptCode` and `expenseCode`.

- [ ] **Step 4: Update Frontend references**
  Search and replace `codeRecette` -> `receiptCode` and `codeDepense` -> `expenseCode` in Svelte and Astro source files (listed above).

- [ ] **Step 5: Run migration and test suite**
  Apply Drizzle migrations to vitest sqlite mock database (handled automatically in test setups, but run vitest to assert code compatibility).
  Run: `npx vitest run`
  Expected: PASS.

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add libs/features/accounting/data-access/src/schema.ts apps/api/src/index.ts apps/admin-console libs/shared/db/migrations
  git commit -m "feat(accounting): rename codeRecette and codeDepense database columns to English names"
  ```

---

### Task 4: Split Hono API Routes into Vertical Slice API Libraries
**Files:**
- Create: `libs/features/members/api/project.json`
- Create: `libs/features/members/api/tsconfig.json`
- Create: `libs/features/members/api/src/routes.ts`
- Create: `libs/features/members/api/src/index.ts`
- Create: `libs/features/accounting/api/project.json`
- Create: `libs/features/accounting/api/tsconfig.json`
- Create: `libs/features/accounting/api/src/routes.ts`
- Create: `libs/features/accounting/api/src/index.ts`
- Create: `libs/features/expenses/api/project.json`
- Create: `libs/features/expenses/api/tsconfig.json`
- Create: `libs/features/expenses/api/src/routes.ts`
- Create: `libs/features/expenses/api/src/index.ts`
- Create: `libs/features/shop/api/project.json`
- Create: `libs/features/shop/api/tsconfig.json`
- Create: `libs/features/shop/api/src/routes.ts`
- Create: `libs/features/shop/api/src/index.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `tsconfig.base.json`

**Interfaces:**
- Consumes: Feature API routes.
- Produces: Hono sub-routers mounted on the main application routing table.

- [ ] **Step 1: Create folders and project.json files**
  Create the folder tree and write respective `project.json` metadata for the 4 API libraries:
  - `libs/features/members/api/project.json`:
    ```json
    {
      "name": "@metacult/features-members-api",
      "projectType": "library",
      "sourceRoot": "libs/features/members/api/src",
      "tags": ["type:api", "scope:members"]
    }
    ```
  - `libs/features/accounting/api/project.json`:
    ```json
    {
      "name": "@metacult/features-accounting-api",
      "projectType": "library",
      "sourceRoot": "libs/features/accounting/api/src",
      "tags": ["type:api", "scope:accounting"]
    }
    ```
  - `libs/features/expenses/api/project.json`:
    ```json
    {
      "name": "@metacult/features-expenses-api",
      "projectType": "library",
      "sourceRoot": "libs/features/expenses/api/src",
      "tags": ["type:api", "scope:expenses"]
    }
    ```
  - `libs/features/shop/api/project.json`:
    ```json
    {
      "name": "@metacult/features-shop-api",
      "projectType": "library",
      "sourceRoot": "libs/features/shop/api/src",
      "tags": ["type:api", "scope:shop"]
    }
    ```

- [ ] **Step 2: Add aliases in tsconfig.base.json**
  Append path definitions in `tsconfig.base.json`:
  ```json
  "paths": {
    "@metacult/features-members-api": ["libs/features/members/api/src/index.ts"],
    "@metacult/features-accounting-api": ["libs/features/accounting/api/src/index.ts"],
    "@metacult/features-expenses-api": ["libs/features/expenses/api/src/index.ts"],
    "@metacult/features-shop-api": ["libs/features/shop/api/src/index.ts"]
  }
  ```

- [ ] **Step 3: Move route handlers from main index.ts to Domain Routers**
  Extract route handlers from `apps/api/src/index.ts` and define Hono routers in:
  - `libs/features/members/api/src/routes.ts` (Members endpoints)
  - `libs/features/members/api/src/index.ts` (exports Hono members router)
  - `libs/features/accounting/api/src/routes.ts` (Accounting & Invoices endpoints)
  - `libs/features/accounting/api/src/index.ts` (exports accounting router)
  - `libs/features/expenses/api/src/routes.ts` (Expenses endpoints)
  - `libs/features/expenses/api/src/index.ts` (exports expenses router)
  - `libs/features/shop/api/src/routes.ts` (Shop & Products endpoints)
  - `libs/features/shop/api/src/index.ts` (exports shop router)

- [ ] **Step 4: Mount sub-routers in main API index.ts**
  Simplify `apps/api/src/index.ts` by removing raw handlers and mounting routers:
  ```typescript
  import { membersRouter } from '@metacult/features-members-api';
  import { accountingRouter } from '@metacult/features-accounting-api';
  import { expensesRouter } from '@metacult/features-expenses-api';
  import { shopRouter } from '@metacult/features-shop-api';

  const app = new Hono<{ Bindings: Env }>();

  // Mount routers
  app.route('/members', membersRouter);
  app.route('/accounting', accountingRouter);
  app.route('/expenses', expensesRouter);
  app.route('/shop', shopRouter);
  ```

- [ ] **Step 5: Run tests and verify workspace health**
  Run: `npx vitest run`
  Expected: All 128 integration tests pass.
  Run: `npx astro check`
  Expected: 0 errors.

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add libs/features tsconfig.base.json apps/api/src/index.ts
  git commit -m "feat(api): modularize Hono endpoints into vertical feature routers"
  ```
