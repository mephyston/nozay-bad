<script lang="ts">
  import { Settings, Plus, Save, Trash2, Edit } from "@lucide/svelte";
  import { Badge, Button, Input, DataTable, DataTableToolbar, DataTableColumnHeader, Checkbox, Sheet, AlertDialog, FormField, Card, Table, SearchableCombobox , dockDePage } from '@nba/ui';
  import type { Category, ProductCategory } from "./settings-types";
  import ProductCategoryList from './ProductCategoryList.svelte';

  let {
    productCategories = [],
    categories = [],
    isSubmitting = false,
    onUpdateProductCategory,
    onDeleteProductCategory,
    onCreateProductCategory,
    tabsNav
  }: {
    productCategories: ProductCategory[];
    categories: Category[];
    isSubmitting: boolean;
    onUpdateProductCategory: (id: number, updates: {
      label: string;
      accountingCategoryId: number;
      active: boolean;
    }) => Promise<boolean>;
    onDeleteProductCategory: (id: number) => Promise<boolean>;
    onCreateProductCategory: (data: {
      label: string;
      accountingCategoryId: number;
      active: boolean;
    }) => Promise<boolean>;
    tabsNav?: any;
  } = $props();

  let showAddSheet = $state(false);

  // Form State
  let newLabel = $state('');
  let newAccountingCategoryId = $state<number | null>(null);
  let newActive = $state(true);

  let editingId = $state<number | null>(null);
  let editLabel = $state('');
  let editAccountingCategoryId = $state<number | null>(null);
  let editActive = $state(true);
  
  let deletingId = $state<number | null>(null);
  let showDeleteDialog = $state(false);

  function confirmDelete(id: number) {
    deletingId = id;
    showDeleteDialog = true;
  }

  async function executeDelete() {
    if (deletingId === null) return;
    const id = deletingId;
    deletingId = null;
    showDeleteDialog = false;
    await onDeleteProductCategory(id);
  }

  // Fermer sans attendre effaçait la saisie même quand le serveur refusait.
  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newAccountingCategoryId) return;
    const created = await onCreateProductCategory({
      label: newLabel,
      accountingCategoryId: newAccountingCategoryId,
      active: newActive
    });
    if (!created) return;
    newLabel = '';
    newAccountingCategoryId = null;
    newActive = true;
    showAddSheet = false;
  }

  function startEdit(cat: ProductCategory) {
    editingId = cat.id;
    editLabel = cat.label;
    editAccountingCategoryId = cat.accountingCategoryId;
    editActive = cat.active;
  }

  async function handleSaveEdit(e: Event) {
    e.preventDefault();
    if (editingId === null || !editAccountingCategoryId) return;
    const updated = await onUpdateProductCategory(editingId, {
      label: editLabel,
      accountingCategoryId: editAccountingCategoryId,
      active: editActive
    });
    if (updated) editingId = null;
  }

  function getCategoryLabel(id: number) {
    return categories.find(c => c.id === id)?.adminLabel || 'Inconnu';
  }

  /*
    La création descend dans la barre du bas, comme sur tous les autres écrans : le
    bouton vivait en haut d'une barre d'outils qui défile avec la liste, donc hors de
    vue dès qu'on en parcourt le contenu — c'est-à-dire chaque fois qu'on vient y ajouter
    quelque chose.
  */
  $effect(() =>
    dockDePage.declarerActions([
      { id: 'produit', label: 'Nouvelle catégorie', icon: Plus, run: () => (showAddSheet = true) }
    ])
  );
</script>

  <DataTable
    mobileSpacing="list"
    data={productCategories}
    emptyTitle="Aucune catégorie"
    emptyDescription="Aucune catégorie de produit n'a encore été créée."
  >
    {#snippet toolbarStart()}
      {#if tabsNav}
        {@render tabsNav()}
      {/if}
    {/snippet}

    {#snippet toolbar()}
      <DataTableToolbar hasSearch={false}>
        {#snippet actions()}
          <Button onclick={() => showAddSheet = true} size="sm" class="hidden md:flex font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <Plus class="w-4 h-4" />
            Nouvelle catégorie
          </Button>
        {/snippet}
      </DataTableToolbar>
    {/snippet}

    {#snippet mobileView()}
      <ProductCategoryList
        {productCategories}
        accountingCategories={categories}
        onEdit={startEdit}
        onDelete={(cat) => confirmDelete(cat.id)}
      />
    {/snippet}

    {#snippet header()}
      <DataTableColumnHeader title="Libellé" class="w-full sm:w-[300px]" />
      <DataTableColumnHeader title="Catégorie Comptable" class="hidden sm:table-cell" />
      <DataTableColumnHeader title="Actif" class="w-[100px] text-center hidden md:table-cell" />
      <DataTableColumnHeader title="Actions" class="w-[120px] text-right" />
    {/snippet}

    {#snippet row(cat)}
      <Table.Row>
        <Table.Cell class="font-medium">
          {cat.label}
        </Table.Cell>
        <Table.Cell class="hidden sm:table-cell">
          <Badge variant="outline">
            {getCategoryLabel(cat.accountingCategoryId)}
          </Badge>
        </Table.Cell>
        <Table.Cell class="text-center hidden md:table-cell">
          {#if cat.active}
            <Badge variant="success">Oui</Badge>
          {:else}
            <Badge variant="secondary">Non</Badge>
          {/if}
        </Table.Cell>
        <Table.Cell class="text-right space-x-1">
          <div class="flex justify-end items-center gap-2">
            <Button variant="ghost-muted" size="icon" onclick={() => startEdit(cat)}>
              <Edit class="w-4 h-4" />
            </Button>
            <Button variant="ghost-danger" size="icon" onclick={() => confirmDelete(cat.id)} disabled={isSubmitting}>
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </Table.Cell>
      </Table.Row>
    {/snippet}
  </DataTable>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content size="md">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle catégorie
      </Sheet.Title>
      <Sheet.Description>
        Ajoutez une catégorie pour classer les produits dans la boutique.
      </Sheet.Description>
    </Sheet.Header>
    <form class="space-y-6 pt-6" onsubmit={handleCreate}>
      <FormField id="new-label" label="Libellé de la catégorie">
      <Input id="new-label" bind:value={newLabel} placeholder="Ex: Raquettes, Textile, Volants" required />
      </FormField>

        <FormField id="new-category" label="Catégorie Comptable associée">
        <SearchableCombobox id="new-category" items={categories.map((c) => ({ label: c.adminLabel, value: c.id }))} bind:value={newAccountingCategoryId} placeholder="Sélectionner une catégorie..." />
      <p class="text-xs text-muted-foreground mt-1.5">Les ventes de ces produits seront affectées à ce compte.</p>
      </FormField>

          <div class="p-3 rounded-lg border border-border bg-muted/20">
          <FormField id="new-active" label="Statut Actif">
          <div class="flex items-center justify-between">
          <p class="text-xs text-muted-foreground">Rendre cette catégorie visible et utilisable.</p>
          <Checkbox id="new-active" bind:checked={newActive} />
        </div>
        </FormField>
      </div>

      <Button type="submit" class="w-full font-bold" disabled={isSubmitting}>
        {isSubmitting ? 'Création...' : 'Créer la catégorie'}
      </Button>
    </form>
  </Sheet.Content>
</Sheet.Root>

<Sheet.Root open={!!editingId} onOpenChange={(o) => { if (!o) editingId = null; }}>
  <Sheet.Content size="md">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Edit class="w-5 h-5 text-primary" />
        Modifier la catégorie
      </Sheet.Title>
      <Sheet.Description>
        Modifiez le libellé ou la catégorie comptable associée.
      </Sheet.Description>
    </Sheet.Header>
    <form class="space-y-6 pt-6" onsubmit={handleSaveEdit}>
      <FormField id="edit-label" label="Libellé de la catégorie">
      <Input id="edit-label" bind:value={editLabel} required />
      </FormField>

        <FormField id="edit-category" label="Catégorie Comptable associée">
        <SearchableCombobox id="edit-category" items={categories.map((c) => ({ label: c.adminLabel, value: c.id }))} bind:value={editAccountingCategoryId} placeholder="Sélectionner une catégorie..." />
      <p class="text-xs text-muted-foreground mt-1.5">Les ventes de ces produits seront affectées à ce compte.</p>
      </FormField>

          <div class="p-3 rounded-lg border border-border bg-muted/20">
          <FormField id="edit-active" label="Statut Actif">
          <div class="flex items-center justify-between">
          <p class="text-xs text-muted-foreground">Rendre cette catégorie visible et utilisable.</p>
          <Checkbox id="edit-active" bind:checked={editActive} />
        </div>
        </FormField>
      </div>

      <Button type="submit" class="w-full font-bold" disabled={isSubmitting}>
        {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </Button>
    </form>
  </Sheet.Content>
</Sheet.Root>

<AlertDialog.Root bind:open={showDeleteDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Confirmer la suppression</AlertDialog.Title>
      <AlertDialog.Description>
        Êtes-vous sûr de vouloir supprimer cette catégorie de produits ?
        Si des produits y sont rattachés, la suppression échouera.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => { showDeleteDialog = false; deletingId = null; }}>Annuler</AlertDialog.Cancel>
      <AlertDialog.Action onclick={executeDelete} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
