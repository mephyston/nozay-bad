# Plan d'Implémentation : Refonte du Grand Livre (Transaction Ledger)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Moderniser le Grand Livre (`TransactionLedger.svelte`) en remplaçant le menu d'actions customisé par un Popover et en structurant le formulaire de saisie Dialog sous forme de grille responsive.

**Architecture:** Remplacement du popup d'actions manuel par `<Popover.Root>`, ce qui permet de supprimer les fonctions et effets globaux de gestion de clics obsolètes. Réorganisation des champs de formulaires avec des classes de grille Tailwind CSS et le composant `<Label>` standard.

**Tech Stack:** Svelte 5, TypeScript, Lucide Icons, Shadcn Svelte (@nba/ui : Popover, Label, Input, Button, Table).

## Global Constraints

* Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
* Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
* Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
* Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Migration du menu d'actions vers le composant Popover

**Files:**
* Modify: `libs/features/accounting/ui/src/TransactionLedger.svelte`
* Modify: `libs/features/accounting/ui/src/TransactionLedger.test.ts`

**Interfaces:**
* Consumes: Popover de `@nba/ui`.
* Produces: Une interface d'action popover accessible et standardisée pour chaque ligne de transaction.

- [ ] **Step 1: Write the failing test in TransactionLedger.test.ts**

Ouvrir [TransactionLedger.test.ts](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.test.ts) et ajouter un test qui vérifie que le popover s'ouvre au clic :

```typescript
  it('should render actions trigger and open edit/delete buttons inside Popover', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const component = mount(TransactionLedger, {
      target,
      props: {
        transactions: [
          {
            id: 1,
            seasonId: '25-26',
            type: 'recette',
            accountId: 'current',
            destinationAccountId: null,
            category: '1',
            amount: 1500,
            date: '2026-07-16',
            paymentMethod: 'virement',
            description: 'Cotisation Test',
            reference: null
          }
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        seasonId: '25-26',
        balances: []
      }
    });
    flushSync();

    // Trouver le bouton d'actions (MoreVertical)
    const triggerBtn = target.querySelector('button[aria-label="Actions"]') as HTMLButtonElement;
    expect(triggerBtn).toBeDefined();

    // Cliquer sur le déclencheur pour ouvrir le Popover
    triggerBtn.click();
    flushSync();

    // Laisser le temps à Melt UI d'hydrater et positionner le popover
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Vérifier la présence des options
    expect(document.body.innerHTML).toContain('Éditer');
    expect(document.body.innerHTML).toContain('Supprimer');

    unmount(component);
    document.body.removeChild(target);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run libs/features/accounting/ui/src/TransactionLedger.test.ts`
Expected: FAIL (l'importation ou l'ouverture du Popover échoue ou n'est pas codée).

- [ ] **Step 3: Implement Popover and clean up manual event handlers**

Modifier [TransactionLedger.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.svelte) :
1. Importer `Popover` de `@nba/ui`.
2. Supprimer `openDropdownId`, `toggleDropdown` et l'effet `$effect` d'écouteur global de clic.
3. Remplacer le bloc d'actions absolu par la structure `<Popover.Root>`, `<Popover.Trigger asChild>` et `<Popover.Content>`.

```html
<!-- Fichier : libs/features/accounting/ui/src/TransactionLedger.svelte -->
<script lang="ts">
  import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle, ChevronLeft, ChevronRight, MoreVertical, Edit2 } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Dialog, Popover } from '@nba/ui';

  // ... interfaces et types ...

  let {
    // ... props ...
  } = $props();

  import { onMount } from 'svelte';
  import { X } from 'lucide-svelte';

  // ... fonctions de pagination et filtres ...

  // Saisie formulaire
  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let open = $state(false);
  $effect(() => {
    open = showPanel !== null;
  });
  $effect(() => {
    if (!open) {
      showPanel = null;
    }
  });
  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('1');
  let accountId = $state<'current' | 'savings' | 'cash'>('current');
  let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
  let paymentMethod = $state('virement');
  let description = $state('');
  let reference = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  let selectedSeason = $state(seasonId);
  let targetSeasonId = $state(seasonId);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);

  let editingId = $state<number | null>(null);

  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    editingId = tx.id;
    amount = (tx.amount / 100).toFixed(2);
    date = tx.date;
    category = tx.category || '1';
    accountId = tx.accountId;
    destinationAccountId = tx.destinationAccountId || 'cash';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
  }

  // ... reste des helpers et méthodes d'API ...
</script>

<!-- ... (Bandeau des soldes et barre d'actions restants) ... -->

<!-- Remplacement dans la colonne Actions du tableau -->
<Table.Cell class="p-4 text-right relative">
  {#if !isClosed}
    <Popover.Root>
      <Popover.Trigger asChild>
        {#snippet child({ props })}
          <Button 
            {...props}
            variant="ghost"
            size="icon-xs"
            class="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center" 
            aria-label="Actions"
          >
            <MoreVertical class="w-4 h-4" />
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-32 p-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border" align="end">
        <Button
          variant="ghost"
          onclick={(e) => startEdit(tx, e)}
          class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
        >
          <Edit2 class="w-3.5 h-3.5" />
          Éditer
        </Button>
        <Button
          variant="ghost"
          onclick={() => handleDelete(tx.id)}
          class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent h-auto rounded-none justify-start"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Supprimer
        </Button>
      </Popover.Content>
    </Popover.Root>
  {/if}
</Table.Cell>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run libs/features/accounting/ui/src/TransactionLedger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add libs/features/accounting/ui/src/TransactionLedger.svelte libs/features/accounting/ui/src/TransactionLedger.test.ts
git commit -m "feat(accounting): migrate transaction ledger actions to Popover component"
```

---

### Task 2: Refonte du formulaire de saisie Dialog en Grille

**Files:**
* Modify: `libs/features/accounting/ui/src/TransactionLedger.svelte`

**Interfaces:**
* Consumes: Primitives `Label`, `Input`, `Dialog` de `@nba/ui`.
* Produces: Un formulaire en grille responsive pour la saisie des écritures.

- [ ] **Step 1: Implement grid structure in TransactionLedger.svelte**

Ouvrir [TransactionLedger.svelte](file:///Users/david/Lab/nozay-bad/libs/features/accounting/ui/src/TransactionLedger.svelte) et modifier le contenu `<Dialog.Content>` :
1. Importer `Label` de `@nba/ui`.
2. Restructurer les champs en `grid grid-cols-2 gap-4`.

```html
<!-- Fichier : libs/features/accounting/ui/src/TransactionLedger.svelte -->
<script lang="ts">
  import { Search, Plus, Trash2, ArrowLeftRight, Check, AlertCircle, ChevronLeft, ChevronRight, MoreVertical, Edit2 } from 'lucide-svelte';
  import { Button, Table, Input, Badge, Card, Dialog, Popover, Label } from '@nba/ui';
  // ... reste du script ...
</script>

<!-- ... (balisage existant) ... -->

  <!-- Modale de saisie coulissante -->
  <Dialog.Root bind:open>
    <Dialog.Content class="max-w-md p-6 bg-card border-border overflow-y-auto max-h-[90vh]">
      <Dialog.Header>
        <Dialog.Title>
          {#if editingId}
            {#if showPanel === 'recette'}🟢 Modifier la recette{:else if showPanel === 'depense'}🔴 Modifier la dépense{:else}🔵 Modifier le virement interne{/if}
          {:else}
            {#if showPanel === 'recette'}🟢 Saisir une recette{:else if showPanel === 'depense'}🔴 Saisir une dépense{:else}🔵 Faire un virement interne{/if}
          {/if}
        </Dialog.Title>
        <Dialog.Description class="hidden">Formulaire de saisie d'écriture comptable</Dialog.Description>
      </Dialog.Header>

      <form onsubmit={handleAddTransaction} class="space-y-4">
        {#if errorMsg}
          <div class="p-3 bg-destructive/15 border border-destructive text-destructive text-xs rounded-md flex items-center gap-2">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        {/if}

        <!-- Ligne 1 : Montant et Date en Grille -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label for="amount-input" class="mb-1 block">Montant (€)</Label>
            <Input id="amount-input" type="number" step="0.01" min="0.01" bind:value={amount} required />
          </div>
          <div>
            <Label for="date-input" class="mb-1 block">Date</Label>
            <Input id="date-input" type="date" bind:value={date} required />
          </div>
        </div>

        <!-- Ligne 2 : Saison -->
        <div>
          <Label for="season-select-panel" class="mb-1 block">Saison d'affectation</Label>
          <select id="season-select-panel" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary font-medium" bind:value={targetSeasonId}>
            {#each seasons as s}
              <option value={s.id}>{s.name}</option>
            {/each}
            {#if seasons.length === 0}
              <option value="25-26">Saison 2025-2026</option>
            {/if}
          </select>
        </div>

        <!-- Ligne 3 : Catégorie / Comptes en Grille -->
        {#if showPanel !== 'transfert'}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="category-select" class="mb-1 block">Catégorie</Label>
              <select id="category-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={category}>
                {#each activeCategories as cat}
                  <option value={cat.id}>{cat.name}</option>
                {/each}
              </select>
            </div>
            <div>
              <Label for="account-select" class="mb-1 block">Compte financier</Label>
              <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="account-select" class="mb-1 block">Compte Source</Label>
              <select id="account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={accountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  <option value={key}>{label}</option>
                {/each}
              </select>
            </div>
            <div>
              <Label for="dest-account-select" class="mb-1 block">Compte Destinataire</Label>
              <select id="dest-account-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={destinationAccountId}>
                {#each Object.entries(accountLabels) as [key, label]}
                  {#if key !== accountId}
                    <option value={key}>{label}</option>
                  {/if}
                {/each}
              </select>
            </div>
          </div>
        {/if}

        <!-- Ligne 4 : Moyen de paiement -->
        {#if showPanel !== 'transfert'}
          <div>
            <Label for="payment-method-select" class="mb-1 block">Moyen de paiement</Label>
            <select id="payment-method-select" class="w-full px-3 py-2 border border-border bg-background rounded-md text-sm focus:ring-1 focus:ring-primary" bind:value={paymentMethod}>
              {#each Object.entries(methodLabels) as [key, label]}
                <option value={key}>{label}</option>
              {/each}
            </select>
          </div>
        {/if}

        <!-- Lignes 5 et 6 : Description & Référence -->
        <div>
          <Label for="description-input" class="mb-1 block">Description / Motif</Label>
          <Input id="description-input" type="text" placeholder="Ex: Cotisation annuelle..." bind:value={description} required />
        </div>

        <div>
          <Label for="ref-input" class="mb-1 block">Référence (Optionnel)</Label>
          <Input id="ref-input" type="text" placeholder="Ex: Chèque n°1234, Virement..." bind:value={reference} />
        </div>

        <div class="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} class="flex-1">
            {isSubmitting ? 'Enregistrement...' : 'Valider'}
          </Button>
          <Button type="button" variant="outline" onclick={() => showPanel = null}>
            Annuler
          </Button>
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Root>
```

- [ ] **Step 2: Run verification checks**

* Run tests: `npx vitest run libs/features/accounting/ui/src/TransactionLedger.test.ts`
* Run typecheck: `npx astro check --root apps/admin-console`

- [ ] **Step 3: Commit**

```bash
git add libs/features/accounting/ui/src/TransactionLedger.svelte
git commit -m "style(accounting): structure transaction form inputs as responsive grid with Label primitive"
```
