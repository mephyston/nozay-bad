<script lang="ts">
  import { Check, Edit2, Trash2, X, MoreHorizontal, PowerOff, Power } from "@lucide/svelte";
  import { Button, Input, Badge, Table, AlertDialog, toast, DropdownMenu } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";

  let {
    cat,
    accountClasses = [],
    isSubmitting = false,
    editingCatId = $bindable(null),
    onUpdateCategory,
    onDeleteCategory
  }: {
    cat: Category;
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    editingCatId: number | null;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      active: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
  } = $props();

  let editCatAdminLabel = $state('');
  let editCatAdherentLabel = $state('');
  let editCatHideInExpenses = $state(false);
  let editCatActive = $state(true);
  let editCatReceiptCode = $state('');
  let editCatExpenseCode = $state('');

  let confirmDialogOpen = $state(false);
  let confirmActionType = $state<'delete' | 'toggleActive' | null>(null);

  function initiateToggleActive() {
    confirmActionType = 'toggleActive';
    confirmDialogOpen = true;
  }

  function initiateDelete() {
    confirmActionType = 'delete';
    confirmDialogOpen = true;
  }

  async function handleConfirmAction() {
    const action = confirmActionType;
    confirmActionType = null;
    confirmDialogOpen = false;
    
    if (action === 'delete') {
      try {
        await onDeleteCategory(cat.id);
        // Toast and reload are handled by the API action in SettingsManager
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la suppression');
      }
    } else if (action === 'toggleActive') {
      try {
        const newActive = !(cat.active ?? true);
        await onUpdateCategory(cat.id, {
          adminLabel: cat.adminLabel,
          adherentLabel: cat.adherentLabel,
          hideInExpenses: cat.hideInExpenses,
          active: newActive,
          receiptCode: cat.receiptCode || null,
          expenseCode: cat.expenseCode || null
        });
        cat.active = newActive; // Instant UI update
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors de la modification');
      }
    }
  }

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
    editCatActive = c.active ?? true;
    
    const rCode = c.receiptCode || (c.receiptAccountClassId ? accountClasses.find(ac => ac.id === c.receiptAccountClassId)?.code : '');
    const eCode = c.expenseCode || (c.expenseAccountClassId ? accountClasses.find(ac => ac.id === c.expenseAccountClassId)?.code : '');

    editCatReceiptCode = rCode || '';
    editCatExpenseCode = eCode || '';
  }

  async function handleSave(id: number) {
    try {
      await onUpdateCategory(id, {
        adminLabel: editCatAdminLabel.trim(),
        adherentLabel: editCatAdherentLabel.trim(),
        hideInExpenses: editCatHideInExpenses,
        active: editCatActive,
        receiptCode: editCatReceiptCode.trim() || null,
        expenseCode: editCatExpenseCode.trim() || null
      });
      cat.adminLabel = editCatAdminLabel.trim();
      cat.adherentLabel = editCatAdherentLabel.trim();
      cat.hideInExpenses = editCatHideInExpenses;
      cat.active = editCatActive;
      cat.receiptCode = editCatReceiptCode.trim() || null;
      cat.expenseCode = editCatExpenseCode.trim() || null;
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modification');
    }
    editingCatId = null;
  }
</script>

<Table.Row>
  <Table.Cell>
    <span class="font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">#{cat.id}</span>
    <span class="ml-1.5 text-xs text-muted-foreground">{cat.code}</span>
    {#if cat.active === false}
      <Badge variant="outline" class="ml-2 bg-destructive/10 text-destructive border-destructive/20 text-[10px] py-0 px-1 font-semibold">Inactif</Badge>
    {/if}
  </Table.Cell>
  <Table.Cell>
    {#if editingCatId === cat.id}
      <Input type="text" bind:value={editCatAdminLabel} class="h-7 text-xs font-medium" />
    {:else}
      <span class="font-semibold text-foreground">{cat.adminLabel}</span>
    {/if}
  </Table.Cell>
  <Table.Cell>
    {#if editingCatId === cat.id}
      <Input type="text" bind:value={editCatAdherentLabel} class="h-7 text-xs font-medium" />
    {:else}
      <span class="text-foreground">{cat.adherentLabel}</span>
    {/if}
  </Table.Cell>
  <Table.Cell>
    {#if editingCatId === cat.id}
      <select bind:value={editCatReceiptCode} class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium">
        <option value="">N/A</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'recette') as ac}
          <option value={ac.code}>{ac.code} - {ac.label}</option>
        {/each}
      </select>
    {:else}
      {@const rCode = cat.receiptCode || (cat.receiptAccountClassId ? accountClasses.find(ac => ac.id === cat.receiptAccountClassId)?.code : null)}
      <span class="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{rCode || 'N/A'}</span>
    {/if}
  </Table.Cell>
  <Table.Cell>
    {#if editingCatId === cat.id}
      <select bind:value={editCatExpenseCode} class="w-full px-2 py-1 border border-border bg-background rounded text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium">
        <option value="">N/A</option>
        {#each (accountClasses || []).filter(ac => ac.type === 'depense') as ac}
          <option value={ac.code}>{ac.code} - {ac.label}</option>
        {/each}
      </select>
    {:else}
      {@const eCode = cat.expenseCode || (cat.expenseAccountClassId ? accountClasses.find(ac => ac.id === cat.expenseAccountClassId)?.code : null)}
      <span class="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded">{eCode || 'N/A'}</span>
    {/if}
  </Table.Cell>
  <Table.Cell>
    {#if editingCatId === cat.id}
      <div class="flex flex-col gap-1.5">
        <div class="flex items-center gap-1.5">
          <input type="checkbox" id="edit-hide-{cat.id}" bind:checked={editCatHideInExpenses} class="rounded border-border focus:ring-primary h-3.5 w-3.5" />
          <label for="edit-hide-{cat.id}" class="text-xs text-muted-foreground">Masquer dépenses</label>
        </div>
        <div class="flex items-center gap-1.5">
          <input type="checkbox" id="edit-active-{cat.id}" bind:checked={editCatActive} class="rounded border-border focus:ring-primary h-3.5 w-3.5" />
          <label for="edit-active-{cat.id}" class="text-xs text-muted-foreground">Actif</label>
        </div>
      </div>
    {:else if cat.hideInExpenses}
      <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold">Masquée</Badge>
    {:else}
      <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">Visible</Badge>
    {/if}
  </Table.Cell>
  <Table.Cell class="text-right relative">
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
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {#snippet child({ props })}
            <Button {...props} aria-haspopup="true" variant="ghost" size="icon">
              <MoreHorizontal class="w-4 h-4" />
              <span class="sr-only">Toggle menu</span>
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); startEditCategory(cat); }} class="cursor-pointer font-semibold">
            <Edit2 class="w-3.5 h-3.5 mr-2" /> Modifier
          </DropdownMenu.Item>
          {#if !defaultCategoryCodes.includes(cat.code)}
            <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); initiateToggleActive(); }} disabled={isSubmitting} class="cursor-pointer font-semibold">
              {#if cat.active ?? true}
                <PowerOff class="w-3.5 h-3.5 text-muted-foreground mr-2" /> Désactiver
              {:else}
                <Power class="w-3.5 h-3.5 text-emerald-500 mr-2" /> Activer
              {/if}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); initiateDelete(); }} disabled={isSubmitting} class="text-destructive focus:text-destructive cursor-pointer font-semibold">
              <Trash2 class="w-3.5 h-3.5 mr-2" /> Supprimer
            </DropdownMenu.Item>
          {/if}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </Table.Cell>
</Table.Row>

<AlertDialog.Root bind:open={confirmDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        {#if confirmActionType === 'delete'}
          Confirmer la suppression
        {:else if confirmActionType === 'toggleActive'}
          {#if cat.active ?? true}
            Désactiver la catégorie ?
          {:else}
            Activer la catégorie ?
          {/if}
        {/if}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {#if confirmActionType === 'delete'}
          Êtes-vous sûr de vouloir supprimer la catégorie <strong>{cat.adminLabel}</strong> ? Cette action est irréversible.
          S'il existe des écritures liées, la suppression sera refusée.
        {:else if confirmActionType === 'toggleActive'}
          {#if cat.active ?? true}
            Désactiver la catégorie empêchera de l'utiliser pour de nouvelles écritures comptables. Les écritures existantes ne seront pas modifiées.
          {:else}
            Activer la catégorie permettra de nouveau de l'utiliser dans la saisie des écritures comptables.
          {/if}
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleConfirmAction} class={confirmActionType === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
        Confirmer
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
