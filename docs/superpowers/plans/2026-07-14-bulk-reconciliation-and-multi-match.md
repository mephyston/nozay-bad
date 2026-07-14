# Plan d'implémentation : Rapprochement Bancaire de Masse, Multi-match et Ventilation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer l'interface de rapprochement bancaire pour supporter la validation en masse, l'association d'un virement à plusieurs commandes en attente (Panier), et l'éclatement manuel d'un virement sur plusieurs écritures comptables.

**Architecture:** Mettre à jour l'API Hono pour gérer les transactions en base par lots (bulk) et les liaisons multiples d'IDs (invoices, orders). Câbler l'UI Svelte 5 pour ajouter des cases à cocher, des onglets de filtres intelligents, une barre d'action groupée, une calculatrice de panier de commande et un formulaire de ventilation dynamique.

**Tech Stack:** Astro, Svelte 5, Drizzle ORM, Hono, Vitest.

## Global Constraints

- Utiliser les versions de bibliothèques déjà présentes dans le monorepo.
- Les tests unitaires et d'intégration doivent utiliser Vitest.
- Le code TypeScript doit compiler sans erreurs strictes (`npx astro check`).
- Toutes les opérations d'écritures ou de modifications d'état comptable doivent échouer si la saison cible est clôturée.

---

### Task 1: API Endpoints (Hono)

**Files:**
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/index.test.ts`

**Interfaces:**
- Produces: `POST /bank-transactions/reconcile-bulk`
  - Request body: `{ requests: Array<{ btId: number, action: 'match' | 'create', transactionId?: number, memberId?: number | null, invoiceId?: number, transaction?: any }> }`
  - Response: `{ success: true, count: number }`
- Produces: `POST /bank-transactions/:id/reconcile` (updated)
  - Request body for split entries: `{ action: 'create', transactions: Array<{ category: string, amount: number, description: string, paymentMethod: string, seasonId: string, accountId: string }> }`
  - Request body for multi-match: `{ action: 'create', invoiceIds: number[], orderIds?: number[], transaction?: any }`

- [ ] **Step 1: Write integration tests for Hono bulk and split/multi-match features**
  Add test blocks to `apps/api/src/index.test.ts` asserting:
  - `POST /bank-transactions/reconcile-bulk` executes successfully when multiple valid suggestions are matched.
  - `POST /bank-transactions/reconcile-bulk` rolls back all changes if one matching operation fails or is closed.
  - `POST /bank-transactions/:id/reconcile` successfully processes split transactions creating multiple entries in `transactionsTable` linked to the same `bankTransactionId`.
  - `POST /bank-transactions/:id/reconcile` successfully matches a single bank transaction to multiple `invoiceIds` by marking their status as `'paid'`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: FAIL with missing bulk endpoint and split/multi-match logic errors.

- [ ] **Step 3: Implement Hono API changes**
  In `apps/api/src/index.ts`:
  - Implement `POST /bank-transactions/reconcile-bulk` route. Wrap all request executions in a `db.transaction()` block. For each item in `requests`, run the same matching/creation checks as the individual endpoint.
  - In `POST /bank-transactions/:id/reconcile`, add support for `body.transactions` array. If present, map each item to insert multiple rows in the Drizzle `transactionsTable`.
  - In `POST /bank-transactions/:id/reconcile`, add support for `body.invoiceIds` array. Loop over `invoiceIds` and update status to `'paid'` and `bankTransactionId` to `:id`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run apps/api/src/index.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add apps/api/src/index.ts apps/api/src/index.test.ts
  git commit -m "feat(api): support bulk reconciliation, multi-invoice matching, and split transaction entries"
  ```

---

### Task 2: Svelte UI - Checkboxes & Bulk Action Bar

**Files:**
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.svelte`
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.test.ts`

**Interfaces:**
- Consumes: `POST /bank-transactions/reconcile-bulk` Hono API.

- [ ] **Step 1: Write unit tests for bulk selection and action bar**
  In `apps/admin-console/src/components/BankStatementReconciliation.test.ts`, add test cases asserting:
  - Checkboxes are displayed next to bank transactions in the list.
  - Checking a box displays the "Bulk Action Bar" at the top of the list.
  - Checking multiple boxes updates the count in the Bulk Action Bar.
  - Clicking "Rapprocher en masse" sends a fetch request to `/admin/compta/import` (or API directly) with action `'bulk'` and the selected transaction parameters.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/admin-console/src/components/BankStatementReconciliation.test.ts`
  Expected: FAIL (missing checkboxes, bulk bar, and tabs).

- [ ] **Step 3: Implement checkboxes, smart filters, and bulk bar in Svelte**
  In `apps/admin-console/src/components/BankStatementReconciliation.svelte`:
  - Add state `selectedTxIds = $state<Set<number>>(new Set())` to track selected transactions.
  - Add checkboxes inside each bank transaction row rendering loop.
  - Implement a sticky toolbar above the list rendering conditionally when `selectedTxIds.size > 0`.
  - Implement smart filters buttons/tabs "Tout", "Évidences", "Récurrents" using client-side filtering (`$derived` list of transactions). "Évidences" filters transactions where a suggestion candidate is present.
  - Câbler the bulk validation button to map selected transaction suggestions and submit them to `POST /bank-transactions/reconcile-bulk` via the proxy or API.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run apps/admin-console/src/components/BankStatementReconciliation.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add apps/admin-console/src/components/BankStatementReconciliation.svelte apps/admin-console/src/components/BankStatementReconciliation.test.ts
  git commit -m "feat(ui): add bulk checkboxes, sticky action bar, and smart filter tabs for reconciliation"
  ```

---

### Task 3: Svelte UI - Order Basket & Manual Split Form

**Files:**
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.svelte`
- Modify: `apps/admin-console/src/components/BankStatementReconciliation.test.ts`

**Interfaces:**
- Consumes: `POST /bank-transactions/:id/reconcile` (updated API for split/multi-match).

- [ ] **Step 1: Write unit tests for multi-match order basket and split form**
  In `apps/admin-console/src/components/BankStatementReconciliation.test.ts`, add test cases asserting:
  - Checking multiple unpaid invoices/orders in the "Panier Commande" tab updates the selected sum.
  - The submit button in the basket remains disabled if the selected sum does not equal the bank transaction amount (within 10 cents tolerance).
  - Clicking "Ventiler" in the manual entry tab adds category input rows, and validation locks until split sum equals transaction total.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run apps/admin-console/src/components/BankStatementReconciliation.test.ts`
  Expected: FAIL (missing multiple checks in basket and split form).

- [ ] **Step 3: Implement multi-match order basket and manual split form**
  In `apps/admin-console/src/components/BankStatementReconciliation.svelte`:
  - Update the "Panier Commande" (or "Associer Facture") tab to display checkboxes next to all `unpaidInvoices`. Update the state to track `selectedInvoiceIds = $state<Set<number>>(new Set())`.
  - Calculate `selectedSum = $derived(unpaidInvoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((acc, i) => acc + i.totalAmount, 0))`.
  - Enable the "Valider l'association" button only if `Math.abs(selectedSum - selectedTx.amount) <= 10`.
  - In "Saisir écriture" tab, add a button "Ventiler l'opération". If clicked, render dynamic rows of `{ category, amount }` fields using a Svelte `$state` array of splits. Verify total split amount equals transaction amount before submitting.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run apps/admin-console/src/components/BankStatementReconciliation.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add apps/admin-console/src/components/BankStatementReconciliation.svelte apps/admin-console/src/components/BankStatementReconciliation.test.ts
  git commit -m "feat(ui): implement multi-match order selection basket and dynamic split entries form"
  ```
