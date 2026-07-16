# Plan d'implémentation - Migration et Uniformisation du Design System avec Shadcn-Svelte

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all relocated Svelte UI components in the workspace to consume the unified Shadcn-Svelte components from `@metacult/shared-ui` (such as `Button`, `Table`, `Input`, `Badge`, `Alert`, `Card`, `Dialog`, and `Drawer`) instead of raw HTML elements and custom styles.

**Architecture:** We will proceed block-by-block, feature-by-feature, starting with the simplest components (Shop and Expenses) and moving towards the most complex (Accounting ledgers and reconciliation views). Every refactoring task will preserve functional logic, binding, and event handlers while changing ONLY the markup/styling structure.

**Tech Stack:** Svelte 5 (Runes), Tailwind CSS v4 (configured via Vite), Vitest (jsdom environment), `@metacult/shared-ui`.

## Global Constraints
- Do not modify functional logic or query parameter behaviors in components.
- Ensure all 131 tests compile and pass cleanly after every task.
- Run `npx eslint .` to ensure 0 module boundary or coding style errors.
- Run `npx astro check --root apps/admin-console` to ensure 0 typescript type compilation errors.

---

### Task 1: Refactor Shop UI Components (`ProductsManager.svelte`, `OrdersManager.svelte`)

**Files:**
- Modify: `libs/features/shop/ui/src/ProductsManager.svelte`
- Modify: `libs/features/shop/ui/src/OrdersManager.svelte`
- Test: `libs/features/shop/ui/src/ProductsManager.test.ts`
- Test: `libs/features/shop/ui/src/OrdersManager.test.ts`

**Interfaces:**
- Consumes: `Button`, `Table`, `Input`, `Badge`, `Card` from `@metacult/shared-ui`
- Produces: Visual components using unified design tokens

- [ ] **Step 1: Refactor ProductsManager.svelte**
  Import UI primitives from `@metacult/shared-ui` and rewrite the markup:
  ```svelte
  <script lang="ts">
    import { Button, Input, Badge, Card, Table } from '@metacult/shared-ui';
    // ... logic remains untouched ...
  </script>

  <!-- Replace raw card divs with Card primitives -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Ajouter un produit</Card.Title>
    </Card.Header>
    <Card.Content>
      <!-- Replace raw inputs with Input primitives -->
      <Input type="text" bind:value={name} ... />
    </Card.Content>
  </Card.Root>

  <!-- Replace raw tables with Table primitives -->
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head>Produit</Table.Head>
        <Table.Head>Prix</Table.Head>
      </Table.Row>
    </Table.Header>
    <Table.Body>
      {#each products as product}
        <Table.Row>
          <Table.Cell>{product.name}</Table.Cell>
          <Table.Cell><Badge variant="outline">{product.price}</Badge></Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
  ```

- [ ] **Step 2: Refactor OrdersManager.svelte**
  Import UI primitives and refactor lists/buttons to use `@metacult/shared-ui` `Table`, `Button`, and `Badge`.

- [ ] **Step 3: Run Vitest tests**
  Run: `npx vitest run libs/features/shop/ui`
  Expected: PASS

- [ ] **Step 4: Verify typecheck**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  ```bash
  git add libs/features/shop/ui/src/
  git commit -m "style(shop-ui): migrate products and orders manager to shadcn components"
  ```

---

### Task 2: Refactor Expenses UI Component (`ExpensesManager.svelte`)

**Files:**
- Modify: `libs/features/expenses/ui/src/ExpensesManager.svelte`
- Test: `libs/features/expenses/ui/src/ExpensesManager.test.ts`

**Interfaces:**
- Consumes: `Button`, `Table`, `Input`, `Badge`, `Alert`, `Card` from `@metacult/shared-ui`
- Produces: Standardized ExpensesManager view

- [ ] **Step 1: Refactor ExpensesManager.svelte**
  Import UI primitives from `@metacult/shared-ui` and rewrite markup to replace raw table elements, buttons, inputs, alerts, and card sections.

- [ ] **Step 2: Run Vitest tests**
  Run: `npx vitest run libs/features/expenses/ui`
  Expected: PASS

- [ ] **Step 3: Verify typecheck**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 4: Commit changes**
  ```bash
  git add libs/features/expenses/ui/src/
  git commit -m "style(expenses-ui): migrate expenses manager to shadcn components"
  ```

---

### Task 3: Refactor Members Poona Importer UI Component (`PoonaImporter.svelte`)

**Files:**
- Modify: `libs/features/members/ui/src/PoonaImporter.svelte`
- Test: `libs/features/members/ui/src/PoonaImporter.test.ts`

**Interfaces:**
- Consumes: `Button`, `Card`, `Input` from `@metacult/shared-ui`
- Produces: Standardized PoonaImporter file uploader view

- [ ] **Step 1: Refactor PoonaImporter.svelte**
  Import UI primitives and refactor card layout, file selector drop-area inputs, and import triggers to use `@metacult/shared-ui` components.

- [ ] **Step 2: Run Vitest tests**
  Run: `npx vitest run libs/features/members/ui`
  Expected: PASS

- [ ] **Step 3: Verify typecheck**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 4: Commit changes**
  ```bash
  git add libs/features/members/ui/src/
  git commit -m "style(members-ui): migrate poona importer to shadcn components"
  ```

---

### Task 4: Refactor Accounting UI Configuration Components (`InitialBalancesConfig.svelte`, `CashBoxManager.svelte`, `SettingsManager.svelte`)

**Files:**
- Modify: `libs/features/accounting/ui/src/InitialBalancesConfig.svelte`
- Modify: `libs/features/accounting/ui/src/CashBoxManager.svelte`
- Modify: `libs/features/accounting/ui/src/SettingsManager.svelte`
- Test: `libs/features/accounting/ui/src/InitialBalancesConfig.test.ts`
- Test: `libs/features/accounting/ui/src/CashBoxManager.test.ts`
- Test: `libs/features/accounting/ui/src/SettingsManager.test.ts`

**Interfaces:**
- Consumes: `Button`, `Table`, `Input`, `Badge`, `Card`, `Alert`, `Tabs` from `@metacult/shared-ui`
- Produces: Standardized compta config pages

- [ ] **Step 1: Refactor InitialBalancesConfig.svelte**
  Replace raw balance inputs and tables with `Table` and `Input` from `@metacult/shared-ui`.

- [ ] **Step 2: Refactor CashBoxManager.svelte**
  Update inputs, buttons, and cash flow history table.

- [ ] **Step 3: Refactor SettingsManager.svelte**
  Integrate the `Tabs` and `Card` components from `@metacult/shared-ui` for managing categories, seasons, and account classes.

- [ ] **Step 4: Run Vitest tests**
  Run: `npx vitest run libs/features/accounting/ui/src/InitialBalancesConfig.test.ts libs/features/accounting/ui/src/CashBoxManager.test.ts libs/features/accounting/ui/src/SettingsManager.test.ts`
  Expected: PASS

- [ ] **Step 5: Verify typecheck**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 6: Commit changes**
  ```bash
  git add libs/features/accounting/ui/src/
  git commit -m "style(accounting-ui): migrate settings, cash-box, and initial balances config to shadcn components"
  ```

---

### Task 5: Refactor Accounting UI Processing Components (`CheckDepositManager.svelte`, `InvoicesManager.svelte`, `GeneralMeetingReport.svelte`)

**Files:**
- Modify: `libs/features/accounting/ui/src/CheckDepositManager.svelte`
- Modify: `libs/features/accounting/ui/src/InvoicesManager.svelte`
- Modify: `libs/features/accounting/ui/src/GeneralMeetingReport.svelte`
- Test: `libs/features/accounting/ui/src/CheckDepositManager.test.ts`
- Test: `libs/features/accounting/ui/src/InvoicesManager.test.ts`
- Test: `libs/features/accounting/ui/src/GeneralMeetingReport.test.ts`

**Interfaces:**
- Consumes: `Button`, `Table`, `Input`, `Badge`, `Card`, `Dialog` from `@metacult/shared-ui`
- Produces: Standardized accounting reports and managers

- [ ] **Step 1: Refactor CheckDepositManager.svelte**
  Convert check lists and check slip inputs to use unified table components.

- [ ] **Step 2: Refactor InvoicesManager.svelte**
  Refactor billing forms and unpaid/paid invoices lists.

- [ ] **Step 3: Refactor GeneralMeetingReport.svelte**
  Refactor account tables and budget projection inputs to use `Table`, `Input`, and `Card` primitives.

- [ ] **Step 4: Run Vitest tests**
  Run: `npx vitest run libs/features/accounting/ui/src/CheckDepositManager.test.ts libs/features/accounting/ui/src/InvoicesManager.test.ts libs/features/accounting/ui/src/GeneralMeetingReport.test.ts`
  Expected: PASS

- [ ] **Step 5: Verify typecheck**
  Run: `npx astro check --root apps/admin-console`
  Expected: PASS

- [ ] **Step 6: Commit changes**
  ```bash
  git add libs/features/accounting/ui/src/
  git commit -m "style(accounting-ui): migrate check deposits, invoices, and general meeting reports to shadcn components"
  ```

---

### Task 6: Refactor Accounting UI Ledger & Reconciliation Views (`TransactionLedger.svelte`, `BankStatementReconciliation.svelte`)

**Files:**
- Modify: `libs/features/accounting/ui/src/TransactionLedger.svelte`
- Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.svelte`
- Test: `libs/features/accounting/ui/src/TransactionLedger.test.ts`
- Test: `libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`

**Interfaces:**
- Consumes: `Button`, `Table`, `Input`, `Badge`, `Card`, `Dialog`, `Drawer`, `Tabs` from `@metacult/shared-ui`
- Produces: Fully standardized high-complexity accounting views

- [ ] **Step 1: Refactor TransactionLedger.svelte**
  Refactor the general ledger listings, category filters, page buttons, and transaction insertion Dialog fields.

- [ ] **Step 2: Refactor BankStatementReconciliation.svelte**
  Update the main split panel, ignore list, transaction matching list, manual reconciliation dialog, and AI suggestion sidebar/drawer panels.

- [ ] **Step 3: Run full Vitest suite**
  Run: `npx vitest run`
  Expected: PASS (All 131 tests pass)

- [ ] **Step 4: Run typecheck and ESLint**
  Run: `npx astro check --root apps/admin-console`
  Run: `npx eslint .`
  Expected: PASS (0 errors, 0 warnings)

- [ ] **Step 5: Commit changes**
  ```bash
  git add libs/features/accounting/ui/src/
  git commit -m "style(accounting-ui): migrate ledger and bank reconciliation views to shadcn components"
  ```
