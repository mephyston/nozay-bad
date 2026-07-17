# Invoice Manager Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the Invoices Manager page by moving season controls to Astro and migrating the edit/create form from a Dialog modal to a right-aligned sliding Sheet drawer.

**Architecture:** Astro handles season selection/closed state and reloads on change; Svelte renders a dynamic InvoicesManager Sheet panel; Vitest tests are cleaned up.

**Tech Stack:** Astro, Svelte 5, TypeScript, Tailwind CSS.

## Global Constraints

- Utiliser les versions de bibliothèques déjà présentes dans le monorépo.
- Tous les tests unitaires et d'intégration doivent s'exécuter et réussir sous Vitest via `npx vitest run`.
- Tous les fichiers TypeScript et Svelte doivent compiler sans erreur sous `npx astro check --root apps/admin-console`.
- Les règles de frontières ESLint de Nx doivent être respectées.

---

### Task 1: Astro Page Refactoring (invoices.astro)

**Files:**
- Modify: `apps/admin-console/src/pages/admin/accounting/invoices.astro`

**Interfaces:**
- Consumes: `seasonsList`, `invoicesList`, `season` from the page frontmatter.
- Produces: Visual title, description, right-aligned season selector, closed badge, and client-side page reload script.

- [ ] **Step 1: Update invoices.astro layout template**

Modify the bottom section of `apps/admin-console/src/pages/admin/accounting/invoices.astro` (lines 110-128) to add the title, description, season selector, closed badge, and script:

```html
<Layout title="Factures - NBA 91">
  <AdminLayout client:load email={userEmail} breadcrumb="Comptabilité / Factures">
    <div class="space-y-6">
      {errorMsg && (
        <div class="p-4 bg-destructive/15 border border-destructive text-destructive rounded-lg">
          {errorMsg}
        </div>
      )}

      <div class="flex items-center justify-between print:hidden">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Factures</h1>
          <p class="text-muted-foreground mt-2">
            Création, suivi, validation et rapprochement comptable des factures émises par l'association.
          </p>
        </div>
        <div class="flex items-center gap-3">
          {isClosed && (
            <span class="px-2.5 py-1 text-xs font-bold rounded bg-muted border border-border text-muted-foreground">
              Saison clôturée (Lecture seule)
            </span>
          )}
          <select
            id="season-selector"
            class="px-3 py-1.5 border border-border bg-background rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9"
          >
            {seasonsList.map((s: any) => (
              <option value={s.id} selected={s.id === season}>{s.name}</option>
            ))}
            {seasonsList.length === 0 && (
              <option value="25-26" selected>Saison 2025-2026</option>
            )}
          </select>
        </div>
      </div>

      <InvoicesManager
        client:load
        invoices={invoicesList}
        seasonId={season}
        seasons={seasonsList}
      />
    </div>
  </AdminLayout>
  <script>
    const selector = document.getElementById('season-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        const newSeason = (e.target as HTMLSelectElement).value;
        const params = new URLSearchParams(window.location.search);
        params.set('season', newSeason);
        window.location.href = `/admin/accounting/invoices?${params.toString()}`;
      });
    }
  </script>
</Layout>
```

- [ ] **Step 2: Add isClosed computation to frontmatter**

Add the `isClosed` check logic at the end of the frontmatter section (just before `---` on line 108):

```typescript
const isClosed = !!seasonsList.find((s: any) => s.id === season)?.closed;
```

- [ ] **Step 3: Run diagnostics**

Run: `npx astro check --root apps/admin-console`
Expected: 0 errors, 0 warnings

- [ ] **Step 4: Commit**

```bash
git add apps/admin-console/src/pages/admin/accounting/invoices.astro
git commit -m "feat(accounting): move invoices header and season selector to Astro level"
```

---

### Task 2: Import and Svelte Component Setup (InvoicesManager.svelte)

**Files:**
- Modify: `libs/features/accounting/ui/src/InvoicesManager.svelte`

**Interfaces:**
- Consumes: `@metacult/shared-ui` package components (Sheet instead of Dialog).
- Produces: Cleaned component without season selector and Dialog, using imported Sheet component.

- [ ] **Step 1: Replace Dialog with Sheet in imports**

Modify imports from `@metacult/shared-ui` on line 6 of `libs/features/accounting/ui/src/InvoicesManager.svelte`:

```typescript
import { Button, Table, Input, Badge, Card, Sheet, Alert, Textarea } from '@metacult/shared-ui';
```

- [ ] **Step 2: Remove internal season selector and duplicate headers**

Delete the top card block and duplicate season selector (lines 400-500 depending on exact lines) and double header declarations. The component should begin directly with the list filters and the list table.

- [ ] **Step 3: Run vitest to ensure list rendering test still passes**

Run: `npx vitest run libs/features/accounting/ui/src/InvoicesManager.test.ts`
Expected: Test `renders invoices list correctly` PASS

- [ ] **Step 4: Commit**

```bash
git add libs/features/accounting/ui/src/InvoicesManager.svelte
git commit -m "refactor(accounting): remove internal season selector and update InvoicesManager imports"
```

---

### Task 3: Sheet Migration and Form Layout (InvoicesManager.svelte)

**Files:**
- Modify: `libs/features/accounting/ui/src/InvoicesManager.svelte`

**Interfaces:**
- Consumes: `<Sheet>` components from `@metacult/shared-ui`.
- Produces: Drawer for invoice create/edit, styled with Outfit typography, having a sticky footer.

- [ ] **Step 1: Replace Dialog components with Sheet components**

Replace the template code from `<Dialog.Root bind:open={showModal}>` to `</Dialog.Root>` with:

```html
<Sheet.Root bind:open={showModal}>
  <Sheet.Content class="w-full sm:max-w-2xl flex flex-col h-full bg-card border-border overflow-hidden">
    <Sheet.Header class="p-6 border-b border-border">
      <Sheet.Title class="flex items-center gap-2">
        <FileText class="w-5 h-5 text-primary" />
        {editingId ? 'Modifier la facture' : 'Créer une facture'}
      </Sheet.Title>
      <Sheet.Description class="hidden">Création ou modification des factures NBA 91.</Sheet.Description>
    </Sheet.Header>

    <form onsubmit={handleSubmit} class="flex flex-col flex-1 overflow-hidden">
      <div class="p-6 overflow-y-auto space-y-6 flex-1">
        <!-- Client Information -->
        <div class="space-y-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Informations Client</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="clientName" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Nom du Client *</label>
              <Input
                type="text"
                id="clientName"
                bind:value={clientName}
                placeholder="Ex: Mairie de Nozay ou Nom d'entreprise"
                required
                disabled={isClosed}
              />
            </div>
            <div class="space-y-1.5">
              <label for="clientEmail" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Email du Client</label>
              <div class="relative">
                <Input
                  type="email"
                  id="clientEmail"
                  bind:value={clientEmail}
                  placeholder="client@domaine.com"
                  class="pl-9"
                  disabled={isClosed}
                />
                <Mail class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
          <div class="space-y-1.5">
            <label for="clientAddress" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse du Client</label>
            <div class="relative">
              <Textarea
                id="clientAddress"
                bind:value={clientAddress}
                placeholder="Adresse complète..."
                rows={2}
                class="pl-9"
                disabled={isClosed}
              />
              <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <!-- Details / Period -->
        <div class="space-y-4 pt-4">
          <h4 class="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-1">Objet & Période</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="subject" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Objet de la facture *</label>
              <Input
                type="text"
                id="subject"
                bind:value={subject}
                placeholder="Ex: Subvention 2026, Location..."
                required
                disabled={isClosed}
              />
            </div>
            <div class="space-y-1.5">
              <label for="period" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Période concernée</label>
              <div class="relative">
                <Input
                  type="text"
                  id="period"
                  bind:value={period}
                  placeholder="Ex: Année 2026, Septembre..."
                  class="pl-9"
                  disabled={isClosed}
                />
                <Calendar class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="location" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Lieu</label>
              <div class="relative">
                <Input
                  type="text"
                  id="location"
                  bind:value={location}
                  placeholder="Ex: Nozay"
                  class="pl-9"
                  disabled={isClosed}
                />
                <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <div class="space-y-1.5">
              <label for="attendees" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Participants / Destinataires</label>
              <div class="relative">
                <Input
                  type="text"
                  id="attendees"
                  bind:value={attendees}
                  placeholder="Ex: Jeunes, Licenciés..."
                  class="pl-9"
                  disabled={isClosed}
                />
                <Users class="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="date" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'émission *</label>
              <Input
                type="date"
                id="date"
                bind:value={date}
                required
                disabled={isClosed}
              />
            </div>
            <div class="space-y-1.5">
              <label for="dueDate" class="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date d'échéance *</label>
              <Input
                type="date"
                id="dueDate"
                bind:value={dueDate}
                required
                disabled={isClosed}
              />
            </div>
          </div>
        </div>

        <!-- Billing Items -->
        <div class="space-y-4 pt-4">
          <div class="flex items-center justify-between border-b border-border pb-1">
            <h4 class="text-sm font-bold text-primary uppercase tracking-wider">Lignes de facturation</h4>
            {#if !isClosed}
              <Button type="button" variant="outline" size="sm" onclick={addItem} class="h-8 gap-1">
                <Plus class="w-4 h-4" /> Ajouter une ligne
              </Button>
            {/if}
          </div>

          {#if items.length === 0}
            <Alert.Root variant="info" class="bg-muted/30">
              <Info class="w-4 h-4" />
              <Alert.Description>Aucune ligne de facturation. Veuillez en ajouter au moins une.</Alert.Description>
            </Alert.Root>
          {:else}
            <div class="space-y-3">
              {#each items as item, index}
                <div class="flex items-start gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                  <div class="flex-1 space-y-1.5">
                    <label for={`desc-${index}`} class="sr-only">Description</label>
                    <Input
                      type="text"
                      id={`desc-${index}`}
                      bind:value={item.description}
                      placeholder="Description de la ligne..."
                      required
                      disabled={isClosed}
                    />
                  </div>
                  <div class="w-20 space-y-1.5">
                    <label for={`qty-${index}`} class="sr-only">Quantité</label>
                    <Input
                      type="number"
                      id={`qty-${index}`}
                      bind:value={item.quantity}
                      min="1"
                      required
                      disabled={isClosed}
                    />
                  </div>
                  <div class="w-32 space-y-1.5">
                    <label for={`price-${index}`} class="sr-only">Prix unitaire (€)</label>
                    <Input
                      type="text"
                      id={`price-${index}`}
                      bind:value={item.unitPriceStr}
                      placeholder="0.00"
                      required
                      disabled={isClosed}
                    />
                  </div>
                  {#if !isClosed}
                    <Button type="button" variant="ghost" size="icon" onclick={() => removeItem(index)} class="text-destructive hover:bg-destructive/10 shrink-0">
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <Sheet.Footer class="p-6 border-t border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div class="text-sm font-medium">
          Total : <span class="text-lg font-bold text-primary">{(itemsTotal / 100).toFixed(2)} €</span>
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Button type="button" variant="outline" onclick={() => { showModal = false; }} disabled={isSubmitting}>
            Annuler
          </Button>
          {#if !isClosed}
            <Button type="submit" disabled={isSubmitting || items.length === 0} class="gap-1.5 min-w-[120px]">
              {#if isSubmitting}
                <div class="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                Enregistrement...
              {:else}
                <Check class="w-4 h-4" /> Enregistrer
              {/if}
            </Button>
          {/if}
        </div>
      </Sheet.Footer>
    </form>
  </Sheet.Content>
</Sheet.Root>
```

- [ ] **Step 2: Remove `.font-mono` pricing classes**

Ensure all totals, table cells displaying invoice amounts, and drawer total labels use Outfit typography instead of `.font-mono`.

- [ ] **Step 3: Run vitest**

Run: `npx vitest run libs/features/accounting/ui/src/InvoicesManager.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add libs/features/accounting/ui/src/InvoicesManager.svelte
git commit -m "feat(accounting): convert create/edit form from Dialog modal to Sheet drawer"
```

---

### Task 4: Memory Leak Resolution & Test Cleanup (InvoicesManager.test.ts)

**Files:**
- Modify: `libs/features/accounting/ui/src/InvoicesManager.test.ts`

**Interfaces:**
- Consumes: `unmount` from `svelte`.
- Produces: Memory-leak-free unit test suite.

- [ ] **Step 1: Modify InvoicesManager.test.ts to unmount on afterEach**

Update `libs/features/accounting/ui/src/InvoicesManager.test.ts` to declare `let component: any;` and call `unmount(component)`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import InvoicesManager from './InvoicesManager.svelte';

describe('InvoicesManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const invoices = [
    {
      id: 1,
      invoiceNumber: 'FAC-2526-NBA91-0001',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Mairie de Nozay',
      clientAddress: '1 Rue de la Mairie, 91620 Nozay',
      clientEmail: 'compta@nozay.fr',
      subject: 'Subvention 2026',
      location: 'Nozay',
      period: 'Année 2026',
      attendees: 'Association NBA 91',
      status: 'draft' as const,
      totalAmount: 150000,
      createdAt: '2026-07-14T10:00:00.000Z'
    }
  ];

  let originalFetch: typeof global.fetch;
  let component: any;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (component) {
      unmount(component);
    }
    vi.restoreAllMocks();
  });

  it('renders invoices list correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(InvoicesManager, {
      target,
      props: {
        invoices,
        seasonId: '25-26',
        seasons
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('FAC-2526-NBA91-0001');
    expect(target.innerHTML).toContain('Mairie de Nozay');
    expect(target.innerHTML).toContain('Subvention 2026');
    expect(target.innerHTML).toContain('1500.00 €');
    expect(target.innerHTML).toContain('Brouillon');
  });

  it('opens the create invoice modal when the button is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(InvoicesManager, {
      target,
      props: {
        invoices,
        seasonId: '25-26',
        seasons
      }
    });
    flushSync();

    expect(document.body.innerHTML).not.toContain('Informations Client');

    const createButton = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Créer une facture'
    );
    expect(createButton).toBeDefined();

    createButton?.click();
    flushSync();

    expect(document.body.innerHTML).toContain('Créer une facture');
    expect(document.body.innerHTML).toContain('Informations Client');
    expect(document.body.innerHTML).toContain('Nom du Client *');
    expect(document.body.innerHTML).toContain('Lignes de facturation');
  });
});
```

- [ ] **Step 2: Run all tests to verify green state**

Run: `npx eslint . && npx astro check --root apps/admin-console && npx vitest run`
Expected: 0 ESLint errors, 0 Astro check errors, and all tests PASS

- [ ] **Step 3: Commit**

```bash
git add libs/features/accounting/ui/src/InvoicesManager.test.ts
git commit -m "test(accounting): prevent memory leaks in InvoicesManager test suite"
```
