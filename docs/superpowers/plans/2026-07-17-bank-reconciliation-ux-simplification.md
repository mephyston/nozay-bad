# Plan d'Implémentation : Simplification UX du Rapprochement Bancaire

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supprimer le sous-filtrage intelligent obsolète ("Tout", "Évidences", "Récurrents") de la vue rapprochement bancaire pour épurer l'affichage.

**Tech Stack:** Svelte 5, `@nba/ui` (Tabs, Input, Table, Card, Button, Checkbox).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Nettoyage des tests unitaires obsolètes

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`

**Interfaces:**
* Consumes: Aucune.
* Produces: Une suite de tests propre sans le scénario de test des filtres intelligents supprimés.

- [ ] **Step 1: Delete smart filter test block**

Ouvrir [BankStatementReconciliation.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.test.ts) et supprimer les lignes ~372 à ~444 :
```typescript
  it('filters bank transactions using smart filter tabs (Tout, Évidences, Récurrents)', async () => {
    ...
  });
```

- [ ] **Step 2: Run Vitest tests**

Run: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
Expected: PASS (10/10 tests passés, sans régression).

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.test.ts
git commit -m "test(accounting): delete obsolete smart filter unit test from bank reconciliation suite"
```

---

### Task 2: Nettoyage de la logique, du markup et de l'en-tête de page Astro

**Files:**
* Modify: `libs/features/accounting/ui/src/BankStatementReconciliation.svelte`
* Modify: `apps/admin-console/src/pages/admin/accounting/import.astro`

**Interfaces:**
* Consumes: Primitives Svelte de filtrage et en-tête layout Astro.
* Produces: Une interface épurée sans barre d'onglets de filtrage secondaire et un titre de page uniformisé.

- [ ] **Step 1: Clean up smart filter state and helper functions**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Supprimer le state `smartFilter` :
   ```typescript
   let smartFilter = $state<'all' | 'evidences' | 'recurrents'>('all');
   ```
2. Supprimer la fonction d'aide `isRecurrentTx` :
   ```typescript
   function isRecurrentTx(bt: BankStatementLine) { ... }
   ```
3. Simplifier le tracking dans l'effet `$effect` :
   - Supprimer : `const __ = smartFilter;`
4. Simplifier les conditions dans `displayedTransactions` :
   - Supprimer le filtrage conditionnel par évidence ou récurrence.

- [ ] **Step 2: Remove conditional tabs from HTML template**

Ouvrir [BankStatementReconciliation.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/BankStatementReconciliation.svelte) :
1. Supprimer le bloc conditionnel de la barre d'onglets :
   ```html
   {#if activeTab === 'pending'}
     <Tabs.Root value={smartFilter} onValueChange={(val) => smartFilter = val as any} class="shrink-0 border-b border-border bg-muted/30 p-1">
       ...
     </Tabs.Root>
   {/if}
   ```

- [ ] **Step 3: Uniformise page title in import.astro**

Ouvrir [import.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/import.astro) :
1. Ajouter l'en-tête de titre uniformisé juste après l'ouverture de `<AdminLayout>` :
   ```html
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Rapprochement bancaire</h1>
          <p class="text-muted-foreground mt-2">
            Rapprochez les relevés bancaires importés avec les écritures du grand livre et validez les factures.
          </p>
        </div>
      </div>
   ```

- [ ] **Step 4: Run verification checks**

* Run Vitest tests: `npx vitest run libs/features/accounting/ui/src/BankStatementReconciliation.test.ts`
* Run Astro check: `npx astro check --root apps/admin-console`

- [ ] **Step 5: Commit changes**

```bash
git add libs/features/accounting/ui/src/BankStatementReconciliation.svelte apps/admin-console/src/pages/admin/accounting/import.astro
git commit -m "feat(accounting): remove obsolete smart filter and uniformise bank reconciliation page title"
```
