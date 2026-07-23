# Plan d'Implémentation : Standardisation des Checkboxes de Rapprochement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer les cases à cocher (checkboxes) brutes par le composant standard `<Checkbox>` dans `BankStatementReconciliation.svelte` et mettre à jour la suite de tests pour utiliser les sélecteurs accessibles.

**Tech Stack:** Svelte 5, `@nba/ui` (Checkbox, Button, Table, Input, Badge, Card, Dialog, Tabs).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Rénovation des sélecteurs et interactions dans les tests

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`

**Interfaces:**
* Consumes: Rôle accessible `[role="checkbox"]` et sélecteurs de classes.
* Produces: Une suite de tests unitaires compatible avec le composant standard de case à cocher.

- [ ] **Step 1: Update checkbox query selectors and click events in test file**

Ouvrir [BankStatementReconciliation.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.test.ts) :
1. Remplacer les requêtes de recherche de cases à cocher transactionnelles (lignes ~326) :
   - Modifier :
     ```typescript
     const checkboxes = target.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
     expect(checkboxes.length).toBe(2);
     checkboxes[0].checked = true;
     checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
     ```
   - Par :
     ```typescript
     const checkboxes = target.querySelectorAll('[role="checkbox"]') as NodeListOf<HTMLButtonElement>;
     expect(checkboxes.length).toBe(2);
     checkboxes[0].click();
     flushSync();
     ```
2. Remplacer les requêtes de recherche de cases à cocher de factures (lignes ~497) :
   - Modifier :
     ```typescript
     const invoiceCheckboxes = target.querySelectorAll('input.invoice-checkbox') as NodeListOf<HTMLInputElement>;
     expect(invoiceCheckboxes.length).toBe(2);
     invoiceCheckboxes[0].checked = true;
     invoiceCheckboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
     ```
   - Par :
     ```typescript
     const invoiceCheckboxes = target.querySelectorAll('.invoice-checkbox') as NodeListOf<HTMLButtonElement>;
     expect(invoiceCheckboxes.length).toBe(2);
     invoiceCheckboxes[0].click();
     flushSync();
     ```

- [ ] **Step 2: Run tests to verify failure (RED state)**

Run: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
Expected: FAIL (les sélecteurs `[role="checkbox"]` et le clic ne trouvent pas les éléments ou ne déclenchent pas le bon événement sur les inputs bruts).

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.test.ts
git commit -m "test(accounting): refactor reconciliation tests to use accessible role-based checkbox selectors"
```

---

### Task 2: Refonte des éléments Checkbox dans le composant Svelte

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.svelte`

**Interfaces:**
* Consumes: Primitives `Checkbox` de `@nba/ui`.
* Produces: Cases à cocher standardisées et animées.

- [ ] **Step 1: Replace raw input checkboxes with Checkbox component**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Importer `Checkbox` depuis `@nba/ui` à la ligne 3.
2. Remplacer la case à cocher de transaction bancaire (ligne ~1232) :
   - Remplacer :
     ```html
     <input
       type="checkbox"
       checked={!!selectedTxIds[bt.id]}
       onchange={(e) => {
         selectedTxIds[bt.id] = (e.target as HTMLInputElement).checked;
       }}
       onclick={(e) => e.stopPropagation()}
       class="rounded border-border text-primary focus:ring-primary/20 cursor-pointer w-4 h-4 shrink-0 mt-0.5"
     />
     ```
   - Par :
     ```html
     <Checkbox
       checked={!!selectedTxIds[bt.id]}
       onCheckedChange={(val) => {
         selectedTxIds[bt.id] = !!val;
       }}
       onclick={(e) => e.stopPropagation()}
       class="w-4 h-4 shrink-0 mt-0.5"
     />
     ```
3. Remplacer les cases à cocher des factures (lignes ~1744 et ~1781) :
   - Remplacer :
     ```html
     <input
       type="checkbox"
       class="invoice-checkbox w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer animate-none"
       checked={selectedInvoiceIds.has(inv.id)}
       onchange={() => toggleInvoiceSelection(inv.id)}
     />
     ```
   - Par :
     ```html
     <Checkbox
       class="invoice-checkbox w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer animate-none"
       checked={selectedInvoiceIds.has(inv.id)}
       onCheckedChange={() => toggleInvoiceSelection(inv.id)}
     />
     ```

- [ ] **Step 2: Run verification checks (GREEN state)**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.svelte
git commit -m "feat(accounting): migrate bank statement reconciliation checkboxes to shadcn Checkbox component"
```
