<script lang="ts">
  import { Settings, Plus, Save, Trash2, Edit } from "@lucide/svelte";
  import { Badge, Button, Input, DataTable, DataTableToolbar, DataTableColumnHeader, SwitchField, FormSheet, AlertDialog, FormField, Card, Table, SearchableCombobox , dockDePage } from '@nba/ui';
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
          <Button onclick={() => showAddSheet = true} size="sm" class="hidden md:flex font-bold items-center gap-1.5 shrink-0 self-start sm:self-auto">
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

<!--
  Les deux formulaires montent du bas sur téléphone et gardent leur validation dans la
  barre de la feuille : sous un clavier logiciel, un bouton posé en bas des champs est
  recouvert, et réduire la hauteur de la feuille ne le remonte pas.

  « Statut actif » est un réglage, donc un interrupteur : la case à cocher plaçait
  l'état après une phrase d'explication, à une abscisse différente de chaque rangée.
-->
<FormSheet
  bind:open={showAddSheet}
  title="Nouvelle catégorie"
  description="Ajoutez une catégorie pour classer les produits dans la boutique."
  icon={Plus}
  {isSubmitting}
  submitLabel="Créer la catégorie"
  submittingLabel="Création…"
  onSubmit={handleCreate}
>
  <FormField id="new-label" label="Libellé de la catégorie">
    <Input id="new-label" bind:value={newLabel} placeholder="Ex: Raquettes, Textile, Volants" required />
  </FormField>

  <FormField id="new-category" label="Catégorie Comptable associée" hint="Les ventes de ces produits seront affectées à ce compte.">
    <SearchableCombobox id="new-category" items={categories.map((c) => ({ label: c.adminLabel, value: c.id }))} bind:value={newAccountingCategoryId} placeholder="Sélectionner une catégorie..." />
  </FormField>

  <FormField id="new-active" label="Statut actif">
    <SwitchField
      id="new-active"
      label="Statut actif"
      hint="Rendre cette catégorie visible et utilisable."
      bind:checked={newActive}
    />
  </FormField>
</FormSheet>

<!-- Remonté à chaque catégorie : voir la note de `CategoriesConfig`. -->
{#key editingId}
  <FormSheet
    open={!!editingId}
    onOpenChange={(o) => { if (!o) editingId = null; }}
    title="Modifier la catégorie"
    description="Modifiez le libellé ou la catégorie comptable associée."
    icon={Edit}
    {isSubmitting}
    submitLabel="Enregistrer les modifications"
    onSubmit={handleSaveEdit}
  >
    <FormField id="edit-label" label="Libellé de la catégorie">
      <Input id="edit-label" bind:value={editLabel} required />
    </FormField>

    <FormField id="edit-category" label="Catégorie Comptable associée" hint="Les ventes de ces produits seront affectées à ce compte.">
      <SearchableCombobox id="edit-category" items={categories.map((c) => ({ label: c.adminLabel, value: c.id }))} bind:value={editAccountingCategoryId} placeholder="Sélectionner une catégorie..." />
    </FormField>

    <FormField id="edit-active" label="Statut actif">
      <SwitchField
        id="edit-active"
        label="Statut actif"
        hint="Rendre cette catégorie visible et utilisable."
        bind:checked={editActive}
      />
    </FormField>
  </FormSheet>
{/key}

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
