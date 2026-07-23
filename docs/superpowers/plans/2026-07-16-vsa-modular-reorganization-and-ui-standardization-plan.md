# VSA Reorganization & UI Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple monolithic integration tests into domain route test suites, set up domain-specific Svelte UI libraries, integrate Shadcn-Svelte, and migrate frontend components into their respective VSA slices.

**Architecture:** Create `@nba/db/test-utils` for sharing mock D1 databases across test suites, partition integration tests into feature route test files, scaffold 5 new Svelte UI packages in the Nx monorepo, configure Shadcn-Svelte to target the shared UI library, and update page imports to use path aliases.

**Tech Stack:** Svelte 5, Astro, Hono, Drizzle ORM, Vitest, Tailwind CSS, Shadcn-Svelte, ESLint.

## Global Constraints
* Use the library versions already present in the monorepo.
* All unit and integration tests must run and pass using Vitest.
* All TypeScript files must compile without errors under `npx astro check`.
* ESLint boundary rules must be respected without violations.

---

### Task 1: Extract Shared Database Test Utilities

**Files:**
- Create: `libs/shared/db/src/test-utils.ts`
- Modify: `libs/shared/db/src/index.ts`
- Modify: `libs/shared/db/src/db.test.ts`

**Interfaces:**
- Consumes: Database schema from `@nba/db`
- Produces: `MockD1Database`, `MockD1PreparedStatement`, `setupMockDb` functions exported from `@nba/db/test-utils` or `@nba/db`

- [ ] **Step 1: Create the shared test utilities file**
  Create `libs/shared/db/src/test-utils.ts` with the Mock D1 implementation and a helper to run migrations on it:
  ```typescript
  import { DatabaseSync } from 'node:sqlite';
  import * as fs from 'node:fs';
  import * as path from 'node:path';
  import { drizzle } from 'drizzle-orm/d1';

  export class MockD1Database {
    private db: DatabaseSync;

    constructor() {
      this.db = new DatabaseSync(':memory:');
    }

    async exec(query: string) {
      this.db.exec(query);
      return { count: 0, duration: 0 };
    }

    prepare(query: string) {
      const stmt = this.db.prepare(query);
      return new MockD1PreparedStatement(stmt);
    }

    async batch(statements: MockD1PreparedStatement[]) {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    }
  }

  export class MockD1PreparedStatement {
    private stmt: any;
    private params: any[] = [];

    constructor(stmt: any) {
      this.stmt = stmt;
    }

    bind(...params: any[]) {
      const newStmt = new MockD1PreparedStatement(this.stmt);
      newStmt.params = params.map(p => {
        if (p instanceof Date) return p.getTime();
        if (typeof p === 'boolean') return p ? 1 : 0;
        return p;
      });
      return newStmt;
    }

    async first(key?: string) {
      const row = this.stmt.get(...this.params);
      if (!row) return null;
      if (key) return row[key];
      return row;
    }

    async all() {
      const results = this.stmt.all(...this.params);
      return {
        results,
        success: true,
        meta: { duration: 0, rows_read: results.length, rows_written: 0 }
      };
    }

    async run() {
      this.stmt.run(...this.params);
      return {
        success: true,
        meta: { duration: 0, rows_read: 0, rows_written: 1 }
      };
    }
  }

  export async function setupMockDb() {
    const mockD1 = new MockD1Database();
    const db = drizzle(mockD1 as any);

    // Load migrations sequentially
    const migrationsDir = path.join(process.cwd(), 'libs/shared/db/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      // Split by semicolon and execute statement-by-statement
      const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await mockD1.exec(stmt);
      }
    }

    return { mockD1, db };
  }
  ```

- [ ] **Step 2: Export test utilities**
  Modify `libs/shared/db/src/index.ts` to export these utilities:
  ```typescript
  export * from './test-utils';
  ```

- [ ] **Step 3: Update `db.test.ts` to use shared utilities**
  Modify `libs/shared/db/src/db.test.ts` to delete its duplicate local implementation of `MockD1Database` and import it instead:
  ```typescript
  import { MockD1Database } from './test-utils';
  ```

- [ ] **Step 4: Verify test suite runs successfully**
  Run: `npx vitest run libs/shared/db/src/db.test.ts`
  Expected: PASS (9 tests)

- [ ] **Step 5: Commit work**
  ```bash
  git add libs/shared/db/src/
  git commit -m "chore(db): extract MockD1 and setupMockDb into shared test utilities"
  ```

---

### Task 2: Split Monolithic API Test Suite

**Files:**
- Create: `libs/features/members/api/src/routes.test.ts`
- Create: `libs/features/accounting/api/src/routes.test.ts`
- Create: `libs/features/expenses/api/src/routes.test.ts`
- Create: `libs/features/shop/api/src/routes.test.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Consumes: Hono sub-routers and `setupMockDb` helper
- Produces: Partitioned route integration test files

- [ ] **Step 1: Split Members API Tests**
  Create `libs/features/members/api/src/routes.test.ts` containing members-related test blocks (`POST /members/import`, `GET /members`, `GET /members/:licence`, `/members/:id/cse-data`) extracted from `apps/api/src/index.test.ts`. Use a local `Hono` test instance with `membersRouter`.
  Ensure to import `setupMockDb` from `@metacult/features-members-data-access` (or `@nba/db`).

- [ ] **Step 2: Split Accounting API Tests**
  Create `libs/features/accounting/api/src/routes.test.ts` containing accounting, reconciliation, checking, categories, and account classes test blocks. Use a local `Hono` test instance with `accountingRouter`.

- [ ] **Step 3: Split Expenses API Tests**
  Create `libs/features/expenses/api/src/routes.test.ts` containing expense claim approval, reject, creation, and deletion test blocks. Use a local `Hono` test instance with `expensesRouter`.

- [ ] **Step 4: Split Shop API Tests**
  Create `libs/features/shop/api/src/routes.test.ts` containing product manager and order execution test blocks. Use a local `Hono` test instance with `shopRouter`.

- [ ] **Step 5: Truncate Global API Test File**
  Update `apps/api/src/index.test.ts` to keep only the health check suite and global app mounting tests, deleting all other blocks.

- [ ] **Step 6: Run and verify all API tests**
  Run: `npx vitest run`
  Expected: PASS (128 tests total)

- [ ] **Step 7: Commit work**
  ```bash
  git add libs/features/ apps/api/src/index.test.ts
  git commit -m "test(api): split monolithic integration tests into domain-specific routes.test.ts files"
  ```

---

### Task 3: Initialize UI Libraries in Nx Monorepo

**Files:**
- Create: `libs/shared/ui/project.json`, `libs/shared/ui/tsconfig.json`, `libs/shared/ui/src/index.ts`
- Create: `libs/features/members/ui/project.json`, `libs/features/members/ui/tsconfig.json`, `libs/features/members/ui/src/index.ts`
- Create: `libs/features/accounting/ui/project.json`, `libs/features/accounting/ui/tsconfig.json`, `libs/features/accounting/ui/src/index.ts`
- Create: `libs/features/expenses/ui/project.json`, `libs/features/expenses/ui/tsconfig.json`, `libs/features/expenses/ui/src/index.ts`
- Create: `libs/features/shop/ui/project.json`, `libs/features/shop/ui/tsconfig.json`, `libs/features/shop/ui/src/index.ts`
- Modify: `tsconfig.base.json`

**Interfaces:**
- Consumes: Nx config, tsconfig base
- Produces: 5 library folders with mappings inside `tsconfig.base.json`

- [ ] **Step 1: Scaffold `@nba/ui` files**
  Create `libs/shared/ui/project.json`:
  ```json
  {
    "name": "@nba/ui",
    "$schema": "../../../node_modules/nx/schemas/project-schema.json",
    "projectType": "library",
    "sourceRoot": "libs/shared/ui/src",
    "targets": {},
    "tags": ["type:ui", "scope:shared"]
  }
  ```
  Create `libs/shared/ui/tsconfig.json`:
  ```json
  {
    "extends": "../../../tsconfig.base.json",
    "compilerOptions": {
      "composite": true,
      "declaration": true
    },
    "include": ["src/**/*"]
  }
  ```
  Create `libs/shared/ui/src/index.ts` (empty for now).

- [ ] **Step 2: Scaffold Feature UI libraries**
  Create corresponding `project.json` (with tags `["type:ui", "scope:members"]`, etc.), `tsconfig.json`, and empty `src/index.ts` files for:
  - `libs/features/members/ui`
  - `libs/features/accounting/ui`
  - `libs/features/expenses/ui`
  - `libs/features/shop/ui`

- [ ] **Step 3: Update `tsconfig.base.json` path mappings**
  Modify `tsconfig.base.json` under `compilerOptions.paths` to register:
  ```json
  "@nba/ui": ["libs/shared/ui/src/index.ts"],
  "@nba/members-ui": ["libs/features/members/ui/src/index.ts"],
  "@nba/accounting-ui": ["libs/features/accounting/ui/src/index.ts"],
  "@nba/expenses-ui": ["libs/features/expenses/ui/src/index.ts"],
  "@nba/shop-ui": ["libs/features/shop/ui/src/index.ts"]
  ```

- [ ] **Step 4: Verify Nx shows the new libraries**
  Run: `npx nx show projects`
  Expected: Includes `@nba/ui`, `@nba/members-ui`, `@nba/accounting-ui`, `@nba/expenses-ui`, `@nba/shop-ui`.

- [ ] **Step 5: Commit work**
  ```bash
  git add libs/ tsconfig.base.json
  git commit -m "chore(nx): scaffold shared and feature-specific UI Svelte libraries"
  ```

---

### Task 4: Initialize and Configure Shadcn-Svelte

**Files:**
- Create: `components.json`
- Create: `libs/shared/ui/src/lib/utils.ts`

**Interfaces:**
- Consumes: Tailwind classes and `@tailwindcss/vite` configuration
- Produces: Shadcn Svelte configuration files and tailwind classes hook

- [ ] **Step 1: Write `components.json` at root**
  Create `components.json` configuring paths to resolve directly inside `@nba/ui`:
  ```json
  {
    "$schema": "https://shadcn-svelte.com/schema.json",
    "style": "default",
    "typescript": true,
    "tailwind": {
      "config": "",
      "css": "apps/admin-console/src/styles/global.css",
      "baseColor": "slate"
    },
    "aliases": {
      "components": "libs/shared/ui/src/components",
      "ui": "libs/shared/ui/src/components/ui",
      "utils": "libs/shared/ui/src/lib/utils"
    }
  }
  ```

- [ ] **Step 2: Create local utility function**
  Create `libs/shared/ui/src/lib/utils.ts` containing the standard class merger:
  ```typescript
  import { type ClassValue, clsx } from "clsx";
  import { twMerge } from "tailwind-merge";

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```

- [ ] **Step 3: Generate base Shadcn-Svelte components**
  Run CLI command to generate elements:
  `npx shadcn-svelte@latest add button table input badge alert card dialog drawer`
  Verify they are created under `libs/shared/ui/src/components/ui/`.

- [ ] **Step 4: Export components from shared-ui**
  Modify `libs/shared/ui/src/index.ts` to export these primitives:
  ```typescript
  export { cn } from './lib/utils';
  export { Button } from './components/ui/button';
  export * as Table from './components/ui/table';
  export { Input } from './components/ui/input';
  export { Badge } from './components/ui/badge';
  export * as Alert from './components/ui/alert';
  export * as Card from './components/ui/card';
  export * as Dialog from './components/ui/dialog';
  export * as Drawer from './components/ui/drawer';
  ```

- [ ] **Step 5: Commit work**
  ```bash
  git add components.json libs/shared/ui/src/
  git commit -m "chore(shadcn): initialize shadcn-svelte and generate base UI primitives in shared-ui"
  ```

---

### Task 5: Relocate components, rewrite styles, and rewrite imports

**Files:**
- Create: `libs/features/[feature]/ui/src/index.ts`
- Modify: `apps/admin-console/src/pages/**/*.astro`
- Modify: `eslint.config.js`
- Delete: `apps/admin-console/src/components/*.{svelte,test.ts}` (moved)

**Interfaces:**
- Consumes: Components exported from `@nba/ui`
- Produces: Astro pages importing components via `@metacult/features-[feature]-ui` path aliases

- [ ] **Step 1: Move members Svelte components**
  Move `MemberProfile.svelte`, `MembersTable.svelte`, `PoonaImporter.svelte` (and `.test.ts`) from `apps/admin-console/src/components` to `libs/features/members/ui/src/`.
  Modify `libs/features/members/ui/src/index.ts` to export them.
  Rewrite their internal markup to consume `Table`, `Button`, `Badge` from `@nba/ui` instead of raw HTML tables and custom classes.

- [ ] **Step 2: Move accounting Svelte components**
  Move accounting components (`BankStatementReconciliation`, `InitialBalancesConfig`, `TransactionLedger`, `CheckDepositManager`, `CashBoxManager`, `GeneralMeetingReport`, `SettingsManager`) to `libs/features/accounting/ui/src/`.
  Modify `libs/features/accounting/ui/src/index.ts` to export them.
  Rewrite their markup to use `@nba/ui`.

- [ ] **Step 3: Move expenses and shop Svelte components**
  Move `ExpensesManager` to expenses UI library, and `OrdersManager`/`ProductsManager` to shop UI library. Export them.
  Rewrite markup using `@nba/ui`.

- [ ] **Step 4: Update page import paths in Astro pages**
  Update Astro page controller files in `apps/admin-console/src/pages/admin/` to import from `@metacult/features-[feature]-ui` instead of `../../../components/`.

- [ ] **Step 5: Update ESLint boundary rules**
  Modify `eslint.config.js` to add constraint rules for `type:ui` tags and feature isolation:
  ```javascript
  {
    sourceTag: 'type:ui',
    onlyDependOnLibsWithTags: ['type:ui', 'scope:shared']
  }
  ```

- [ ] **Step 6: Run tests and compilation checks**
  Run: `npx vitest run`
  Run: `npx astro check --root apps/admin-console`
  Run: `npx eslint .`
  Expected: PASS

- [ ] **Step 7: Commit final changes**
  ```bash
  git add .
  git commit -m "refactor(ui): relocate components to feature UI libraries, standardizing on shadcn-svelte primitives"
  ```
