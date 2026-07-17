# Split Accounting Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor and split the 2300-line `libs/features/accounting/api/src/routes.ts` file into modular sub-routers to improve codebase maintainability.

**Architecture:** Create shared helper functions inside `helpers.ts` and separate sub-routers in `src/routes/` for each accounting sub-domain (seasons, transactions, bank, checks, config, invoices). Mount these sub-routers on the parent router in the main routes file.

**Tech Stack:** TypeScript, Hono, Drizzle ORM

## Global Constraints

- Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
- Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
- Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
- Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Extraction des Helpers et Utilitaires

**Files:**
- Create: `libs/features/accounting/api/src/helpers.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: Database schema, `isSeasonClosed`, `normalizeCategory`, and `AppError` from `@metacult/shared-db`.
- Produces: `cleanName`, `parseOFX`, and `reconcileBankTxInternal` inside `libs/features/accounting/api/src/helpers.ts`.

- [ ] **Step 1: Create helpers.ts**
  Create `libs/features/accounting/api/src/helpers.ts` and migrate `cleanName`, `parseOFX`, and `reconcileBankTxInternal` there. Ensure proper imports of database schemas and packages.
- [ ] **Step 2: Import helpers in routes.ts**
  Modify `libs/features/accounting/api/src/routes.ts` to import these helper functions and remove their local implementations.
- [ ] **Step 3: Run Vitest to verify all tests pass**
  Run: `npx vitest run libs/features/accounting/api/`
  Expected: PASS
- [ ] **Step 4: Commit**
  ```bash
  git add libs/features/accounting/api/src/helpers.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): extract shared routes helper functions to helpers.ts"
  ```

---

### Task 2: Sous-routeur des Saisons (Seasons)

**Files:**
- Create: `libs/features/accounting/api/src/routes/seasons.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: `accountingRouter` parent router state and helpers from `src/helpers.ts`.
- Produces: `seasonsRouter` Hono router mounted on `/seasons` prefix.

- [ ] **Step 1: Create seasons.ts router**
  Create `libs/features/accounting/api/src/routes/seasons.ts` containing:
  - `GET /seasons` (retrieve all seasons)
  - `POST /seasons` (create season)
  - `PUT /seasons/:id` (update season)
  - `POST /seasons/:id/close` (close season)
  - `GET /seasons/:seasonId/budget` (get budget)
  - `POST /seasons/:seasonId/budget` (set budget)
  - `GET /seasons/:seasonId/balance` (get season balance)
  - `GET /seasons/:seasonId/balances` (get account balances)
  - `POST /seasons/:seasonId/balances` (set account balances)
  - `GET /seasons/:seasonId/reports` (get reports)
- [ ] **Step 2: Mount seasonsRouter in routes.ts**
  Modify `libs/features/accounting/api/src/routes.ts` to import `seasonsRouter` and mount it using `accountingRouter.route('/seasons', seasonsRouter)`. Remove original handlers from `routes.ts`.
- [ ] **Step 3: Run Vitest to verify tests pass**
  Run: `npx vitest run libs/features/accounting/api/`
  Expected: PASS
- [ ] **Step 4: Commit**
  ```bash
  git add libs/features/accounting/api/src/routes/seasons.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): extract seasons endpoints to a separate sub-router"
  ```

---

### Task 3: Sous-routeur des Transactions (Transactions)

**Files:**
- Create: `libs/features/accounting/api/src/routes/transactions.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: `accountingRouter` parent router state and helpers from `src/helpers.ts`.
- Produces: `transactionsRouter` Hono router mounted on `/transactions` prefix.

- [ ] **Step 1: Create transactions.ts router**
  Create `libs/features/accounting/api/src/routes/transactions.ts` containing:
  - `GET /transactions`
  - `POST /transactions`
  - `PUT /transactions/:id`
  - `DELETE /transactions/:id`
- [ ] **Step 2: Mount transactionsRouter in routes.ts**
  Modify `libs/features/accounting/api/src/routes.ts` to import `transactionsRouter` and mount it using `accountingRouter.route('/transactions', transactionsRouter)`. Remove original handlers from `routes.ts`.
- [ ] **Step 3: Run Vitest to verify tests pass**
  Run: `npx vitest run libs/features/accounting/api/`
  Expected: PASS
- [ ] **Step 4: Commit**
  ```bash
  git add libs/features/accounting/api/src/routes/transactions.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): extract transactions endpoints to a separate sub-router"
  ```

---

### Task 4: Sous-routeur des Écritures Bancaires (Bank Transactions)

**Files:**
- Create: `libs/features/accounting/api/src/routes/bank.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: `reconcileBankTxInternal` and `parseOFX` helpers from `src/helpers.ts`.
- Produces: `bankRouter` Hono router mounted on `/bank-transactions` prefix.

- [ ] **Step 1: Create bank.ts router**
  Create `libs/features/accounting/api/src/routes/bank.ts` containing:
  - `GET /bank-transactions`
  - `POST /bank-transactions/import`
  - `POST /bank-transactions/analyze`
  - `POST /bank-transactions/reconcile-bulk`
  - `POST /bank-transactions/:id/reconcile`
  - `POST /bank-transactions/:id/ignore`
  - `POST /bank-transactions/:id/unignore`
- [ ] **Step 2: Mount bankRouter in routes.ts**
  Modify `libs/features/accounting/api/src/routes.ts` to import `bankRouter` and mount it using `accountingRouter.route('/bank-transactions', bankRouter)`. Remove original handlers from `routes.ts`.
- [ ] **Step 3: Run Vitest to verify tests pass**
  Run: `npx vitest run libs/features/accounting/api/`
  Expected: PASS
- [ ] **Step 4: Commit**
  ```bash
  git add libs/features/accounting/api/src/routes/bank.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): extract bank transactions endpoints to a separate sub-router"
  ```

---

### Task 5: Sous-routeur des Chèques et Remises (Checks)

**Files:**
- Create: `libs/features/accounting/api/src/routes/checks.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: `cleanName` and database helpers.
- Produces: `checksRouter` and `checkDepositsRouter` Hono routers mounted in `routes.ts`.

- [ ] **Step 1: Create checks.ts router**
  Create `libs/features/accounting/api/src/routes/checks.ts` containing:
  - `POST /checks/analyze`
  - `GET /checks`
  - `POST /checks`
  - `DELETE /checks/:id`
  - `POST /check-deposits`
  - `GET /check-deposits`
  - `POST /check-deposits/:id/clear`
  - `POST /check-deposits/:id/delete`
- [ ] **Step 2: Mount checksRouter in routes.ts**
  Modify `libs/features/accounting/api/src/routes.ts` to mount `/checks` and `/check-deposits` sub-routes.
  Remove original handlers from `routes.ts`.
- [ ] **Step 3: Run Vitest to verify tests pass**
  Run: `npx vitest run libs/features/accounting/api/`
  Expected: PASS
- [ ] **Step 4: Commit**
  ```bash
  git add libs/features/accounting/api/src/routes/checks.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): extract checks and check-deposits endpoints to a separate sub-router"
  ```

---

### Task 6: Sous-routeurs Configuration et Factures (Config & Invoices)

**Files:**
- Create: `libs/features/accounting/api/src/routes/config.ts`
- Create: `libs/features/accounting/api/src/routes/invoices.ts`
- Modify: `libs/features/accounting/api/src/routes.ts`

**Interfaces:**
- Consumes: Database schema and parent router bindings.
- Produces: `configRouter` mounted on `/categories` and `/account-classes` prefixes; `invoicesRouter` mounted on `/invoices` prefix.

- [ ] **Step 1: Create config.ts sub-router**
  Create `libs/features/accounting/api/src/routes/config.ts` containing:
  - `GET /categories`, `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id`
  - `GET /account-classes`, `POST /account-classes`, `PUT /account-classes/:code`, `DELETE /account-classes/:code`
- [ ] **Step 2: Create invoices.ts sub-router**
  Create `libs/features/accounting/api/src/routes/invoices.ts` containing:
  - `GET /invoices`, `GET /invoices/:id`, `POST /invoices`, `PUT /invoices/:id`, `DELETE /invoices/:id`, `POST /invoices/:id/status`
- [ ] **Step 3: Mount sub-routers and clean routes.ts**
  Mount them on `accountingRouter` in `libs/features/accounting/api/src/routes.ts`. At this point, the parent `routes.ts` file should only import and mount all sub-routers.
- [ ] **Step 4: Run full validation suite**
  Run: `npx vitest run`
  Expected: All 176 tests pass.
  Run: `npx astro check --root apps/admin-console`
  Expected: 0 errors
  Run: `npx eslint libs/features/accounting/api/src/`
  Expected: 0 errors
- [ ] **Step 5: Commit**
  ```bash
  git add libs/features/accounting/api/src/routes/config.ts libs/features/accounting/api/src/routes/invoices.ts libs/features/accounting/api/src/routes.ts
  git commit -m "refactor(accounting): finalize splitting all accounting route endpoints to sub-routers"
  ```
