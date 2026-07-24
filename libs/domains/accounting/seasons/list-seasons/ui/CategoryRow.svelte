<script lang="ts">
  import { Check, Edit2, Trash2, X, MoreVertical } from "@lucide/svelte";
  import { Button, Input, Badge, Table } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";

  let {
    cat,
    accountClasses = [],
    isSubmitting = false,
    editingCatId = $bindable(null),
    openDropdownId = $bindable(null),
    onUpdateCategory,
    onDeleteCategory
  }: {
    cat: Category;
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    editingCatId: number | null;
    openDropdownId: number | null;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
  } = $props();

  let editCatAdminLabel = $state('');
  let editCatAdherentLabel = $state('');
  let editCatHideInExpenses = $state(false);
  let editCatReceiptCode = $state('');
  let editCatExpenseCode = $state('');

  const defaultCategoryCodes = [
    'adhesions_inscriptions', 'sponsoring', 'subventions', 'actions_jeunes', 'tournois_senior',
    'evenements_buvettes', 'cordage_vente', 'volants', 'salaires_charges', 'materiel_club',
    'licences_federation', 'championnats', 'stages_formations', 'fonctionnement_administratif'
  ];

  function startEditCategory(c: Category) {
    editingCatId = c.id;
    editCatAdminLabel = c.adminLabel;
    editCatAdherentLabel = c.adherentLabel;
    editCatHideInExpenses = c.hideInExpenses;
    editCatReceiptCode = c.receiptCode || '';
    editCatExpenseCode = c.expenseCode || '';
  }

  async function handleSave(id: number) {
    await onUpdateCategory(id, {
      adminLabel: editCatAdminLabel.trim(),
      adherentLabel: editCatAdherentLabel.trim(),
      hideInExpenses: editCatHideInExpenses,
      receiptCode: editCatReceiptCode.trim() || null,
      expenseCode: editCatExpenseCode.trim() || null
    });
    editingCatId = null;
  }

  function toggleDropdown(id: number, e: MouseEvent) {
    e.stopPropagation();
    openDropdownId = openDropdownId === id ? null : id;
  }
</script>

<Table.Row class="hover:bg-muted/50 transition-colors">
  <Table.Cell class="p-4">
    <span class="font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">#{cat.id}</span>
    <span class="ml-1.5 font-mono text-xs text-muted-foreground">{cat.code}</span>
  </Table.Cell>
  <Table.Cell class="p-4">
    {#if editingCatId === cat.id}
      <Input type="text" bind:value={editCatAdminLabel} class="h-7 text-xs font-medium" />
    {:else}
      <span class="font-semibold text-foreground">{cat.adminLabel}</span>
    {/if}
  </Table.Cell>
  <Table.Cell class="p-4">
    {#if editingCatId === cat.id}
      <Input type="text" bind:value={editCatAdherentLabel} class="h-7 text-xs font-medium" />
    {:else}
      <span class="text-foreground">{cat.adherentLabel}</span>
    {/if}
  </Table.Cell>
  <Table.Cell class="p-4">
    {#if editingCatId === cat.id}
      <select bind:value={editCatReceiptCode} class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium">
        <option value="">N/A</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'recette') as ac}
          <option value={ac.code}>{ac.label}</option>
        {/each}
      </select>
    {:else}
      <span class="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{cat.receiptCode || 'N/A'}</span>
    {/if}
  </Table.Cell>
  <Table.Cell class="p-4">
    {#if editingCatId === cat.id}
      <select bind:value={editCatExpenseCode} class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium">
        <option value="">N/A</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'depense') as ac}
          <option value={ac.code}>{ac.label}</option>
        {/each}
      </select>
    {:else}
      <span class="font-mono text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{cat.expenseCode || 'N/A'}</span>
    {/if}
  </Table.Cell>
  <Table.Cell class="p-4">
    {#if editingCatId === cat.id}
      <div class="flex items-center gap-1.5">
        <input type="checkbox" id="edit-hide-{cat.id}" bind:checked={editCatHideInExpenses} class="rounded border-border focus:ring-primary h-3.5 w-3.5" />
        <label for="edit-hide-{cat.id}" class="text-xs text-muted-foreground">Masquer</label>
      </div>
    {:else if cat.hideInExpenses}
      <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">Masquée</Badge>
    {:else}
      <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">Visible</Badge>
    {/if}
  </Table.Cell>
  <Table.Cell class="p-4 text-right relative">
    {#if editingCatId === cat.id}
      <div class="flex justify-end gap-1.5">
        <Button variant="outline" size="icon-xs" onclick={() => editingCatId = null} title="Annuler">
          <X class="w-3.5 h-3.5" />
        </Button>
        <Button size="icon-xs" onclick={() => handleSave(cat.id)} disabled={isSubmitting} title="Enregistrer">
          <Check class="w-3.5 h-3.5" />
        </Button>
      </div>
    {:else}
      <div class="inline-block text-left font-normal">
        <Button variant="ghost" size="icon-xs" onclick={(e) => toggleDropdown(cat.id, e)} aria-label="Actions">
          <MoreVertical class="w-4 h-4" />
        </Button>
        {#if openDropdownId === cat.id}
          <div class="absolute right-4 mt-1 w-32 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 text-left divide-y divide-border">
            <Button
              variant="ghost"
              type="button"
              onclick={(e) => { e.stopPropagation(); startEditCategory(cat); openDropdownId = null; }}
              class="w-full px-3 py-1.5 text-xs text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto rounded-none"
            >
              <Edit2 class="w-3.5 h-3.5" />
              Modifier
            </Button>
            {#if !defaultCategoryCodes.includes(cat.code)}
              <Button
                variant="ghost"
                type="button"
                onclick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); openDropdownId = null; }}
                disabled={isSubmitting}
                class="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 font-semibold flex items-center gap-1.5 cursor-pointer border-0 bg-transparent justify-start h-auto rounded-none"
              >
                <Trash2 class="w-3.5 h-3.5" />
                Supprimer
              </Button>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </Table.Cell>
</Table.Row>
