# Plan d'Implémentation : Intégration de Sheet & Filtre de Comptes (Tabs)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la modale Dialog par un volet coulissant (Sheet) lors de la saisie d'écriture, et ajouter des onglets (Tabs) pour filtrer les transactions par compte de trésorerie (Courant, Épargne, Caisse).

**Tech Stack:** Svelte 5, AstroJS, `@metacult/shared-ui` (Sheet, Tabs, Label, Input, Button, Table).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Implémentation du filtre par compte (Tabs) et routage Astro

**Files:**
* Modify: `apps/admin-console/src/pages/admin/accounting/index.astro`
* Modify: `libs/features/accounting/ui/src/TransactionLedger.svelte`
* Modify: `libs/features/accounting/ui/src/TransactionLedger.test.ts`

**Interfaces:**
* Consumes: Onglets `Tabs` de `@metacult/shared-ui` et paramètre `accountId` de l'API Hono.
* Produces: Une interface d'onglets de filtrage par compte synchronisée avec l'URL.

- [ ] **Step 1: Read and forward accountId in index.astro**

Ouvrir [index.astro](file:///Users/david/Lab/nozay-bad/apps/admin-console/src/pages/admin/accounting/index.astro) :
1. Récupérer le paramètre de recherche `accountId` :
   ```typescript
   const accountId = Astro.url.searchParams.get('accountId') || '';
   ```
2. L'ajouter aux paramètres de l'API de transactions :
   ```typescript
   if (accountId) queryParams.set('accountId', accountId);
   ```
3. Transmettre `accountId` au composant `TransactionLedger` :
   ```html
   <TransactionLedger
     ...
     accountId={accountId}
   />
   ```

- [ ] **Step 2: Add Tabs and effect in TransactionLedger.svelte**

Ouvrir [TransactionLedger.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.svelte) :
1. Importer `Tabs` depuis `@metacult/shared-ui`.
2. Déclarer la prop `accountId` :
   ```typescript
   accountId = ''
   ```
3. Gérer l'état réactif local et l'effet de redirection :
   ```typescript
   let selectedAccount = $state(accountId || 'all');

   $effect(() => {
     if (selectedAccount !== (accountId || 'all')) {
       const params = new URLSearchParams(window.location.search);
       if (selectedAccount === 'all') {
         params.delete('accountId');
       } else {
         params.set('accountId', selectedAccount);
       }
       params.set('page', '1');
       window.location.href = `/admin/accounting?${params.toString()}`;
     }
   });
   ```
4. Ajouter les boutons d'onglets `<Tabs.Root>` au-dessus de la table :
   ```html
   <Tabs.Root bind:value={selectedAccount} class="w-full no-print">
     <Tabs.List class="grid w-full grid-cols-4 max-w-xl">
       <Tabs.Trigger value="all">Tous les comptes</Tabs.Trigger>
       <Tabs.Trigger value="current">Compte Courant</Tabs.Trigger>
       <Tabs.Trigger value="savings">Compte Livret</Tabs.Trigger>
       <Tabs.Trigger value="cash">Caisse Physique</Tabs.Trigger>
     </Tabs.List>
   </Tabs.Root>
   ```

- [ ] **Step 3: Write tests for Tabs rendering and behavior**

Ouvrir [TransactionLedger.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.test.ts) et ajouter un test validant l'état actif des onglets :
```typescript
  it('renders account filtering tabs and indicates active tab', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
        seasonId: '25-26',
        balances: [],
        accountId: 'current'
      }
    });

    expect(target.innerHTML).toContain('Tous les comptes');
    expect(target.innerHTML).toContain('Compte Courant');
    
    // Vérifier que l'onglet Compte Courant est actif
    const activeTab = target.querySelector('[data-state="active"]');
    expect(activeTab).not.toBeNull();
    expect(activeTab?.textContent?.trim()).toBe('Compte Courant');

    unmount(component);
    document.body.removeChild(target);
  });
```

- [ ] **Step 4: Run tests & verify**

* Run tests: `npx vitest run libs/features/accounting/ui/src/TransactionLedger.test.ts`
* Run typecheck: `npx astro check --root apps/admin-console`

- [ ] **Step 5: Commit changes**

```bash
git add apps/admin-console/src/pages/admin/accounting/index.astro libs/features/accounting/ui/src/TransactionLedger.svelte libs/features/accounting/ui/src/TransactionLedger.test.ts
git commit -m "feat(accounting): add account filtering tabs and persist state in search params"
```

---

### Task 2: Remplacement de la modale Dialog par un Sheet coulissant

**Files:**
* Modify: `libs/features/accounting/ui/src/TransactionLedger.svelte`

**Interfaces:**
* Consumes: Primitives `Sheet` de `@metacult/shared-ui`.
* Produces: Une interface de saisie/édition d'écritures coulissante (Sheet) sur le bord droit de l'écran.

- [ ] **Step 1: Replace Dialog components with Sheet components**

Ouvrir [TransactionLedger.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.svelte) :
1. Importer `Sheet` depuis `@metacult/shared-ui`. Supprimer l'import inutile de `Dialog` (si plus utilisé).
2. Remplacer les tags de modale :
   - `<Dialog.Root bind:open>` ➔ `<Sheet.Root bind:open>`
   - `<Dialog.Content class="max-w-md p-6 bg-card border-border overflow-y-auto max-h-[90vh]">` ➔ `<Sheet.Content class="sm:max-w-md p-6 bg-card border-border overflow-y-auto h-full">`
   - `<Dialog.Header>` ➔ `<Sheet.Header>`
   - `<Dialog.Title>` ➔ `<Sheet.Title>`
   - `<Dialog.Description class="hidden">` ➔ `<Sheet.Description class="hidden">`
   - Leurs balises de fermeture respectives.

- [ ] **Step 2: Run verification checks**

* Run tests: `npx vitest run libs/features/accounting/ui/src/TransactionLedger.test.ts`
* Run typecheck: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit changes**

```bash
git add libs/features/accounting/ui/src/TransactionLedger.svelte
git commit -m "feat(accounting): migrate transaction form from Dialog to Sheet components"
```
