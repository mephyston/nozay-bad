<script lang="ts">
  import { Settings, Plus, Save, Trash2, Edit } from "@lucide/svelte";
  import { Card, Button, Sheet, Table, Checkbox, Input, Label, Badge, AlertDialog } from "@nba/ui";
  import type { Category, ProductCategory } from "./settings-types";

  let {
    productCategories = [],
    categories = [],
    isSubmitting = false,
    onUpdateProductCategory,
    onDeleteProductCategory,
    onCreateProductCategory
  }: {
    productCategories: ProductCategory[];
    categories: Category[];
    isSubmitting: boolean;
    onUpdateProductCategory: (id: number, updates: {
      label: string;
      accountingCategoryId: number;
      active: boolean;
    }) => Promise<void>;
    onDeleteProductCategory: (id: number) => Promise<void>;
    onCreateProductCategory: (data: {
      label: string;
      accountingCategoryId: number;
      active: boolean;
    }) => Promise<void>;
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

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!newAccountingCategoryId) return;
    await onCreateProductCategory({
      label: newLabel,
      accountingCategoryId: newAccountingCategoryId,
      active: newActive
    });
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

  async function handleSaveEdit() {
    if (editingId === null || !editAccountingCategoryId) return;
    await onUpdateProductCategory(editingId, {
      label: editLabel,
      accountingCategoryId: editAccountingCategoryId,
      active: editActive
    });
    editingId = null;
  }

  function getCategoryLabel(id: number) {
    return categories.find(c => c.id === id)?.adminLabel || 'Inconnu';
  }
</script>

<Card.Root class="w-full">
  <Card.Header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
    <div>
      <Card.Title class="text-lg font-bold flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Catégories de Produits
      </Card.Title>
      <Card.Description class="mt-1">
        Associez des catégories de produits à des catégories comptables pour générer la comptabilité des commandes.
      </Card.Description>
    </div>
    <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
      <Plus class="w-4 h-4" />
      Nouvelle Catégorie
    </Button>
  </Card.Header>
  <Card.Content class="pt-6">
    <div class="rounded-md border border-border overflow-hidden">
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50 hover:bg-muted/50">
            <Table.Head class="font-semibold h-10 w-[300px]">Libellé</Table.Head>
            <Table.Head class="font-semibold h-10">Catégorie Comptable</Table.Head>
            <Table.Head class="font-semibold h-10 w-[100px] text-center">Actif</Table.Head>
            <Table.Head class="font-semibold h-10 w-[120px] text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each productCategories as cat}
            <Table.Row class="hover:bg-muted/30">
              {#if editingId === cat.id}
                <Table.Cell>
                  <Input bind:value={editLabel} class="h-8" />
                </Table.Cell>
                <Table.Cell>
                  <select bind:value={editAccountingCategoryId} class="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value={null} disabled>Choisir...</option>
                    {#each categories as c}
                      <option value={c.id}>{c.adminLabel}</option>
                    {/each}
                  </select>
                </Table.Cell>
                <Table.Cell class="text-center">
                  <Checkbox bind:checked={editActive} />
                </Table.Cell>
                <Table.Cell class="text-right space-x-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onclick={handleSaveEdit} disabled={isSubmitting}>
                    <Save class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-foreground" onclick={() => editingId = null}>
                    <Trash2 class="w-4 h-4" /> <!-- Using Trash visually as cancel but technically we just set editingId=null, wait, maybe X is better -->
                  </Button>
                </Table.Cell>
              {:else}
                <Table.Cell class="font-medium">
                  {cat.label}
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="outline" class="font-normal bg-card">
                    {getCategoryLabel(cat.accountingCategoryId)}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-center">
                  {#if cat.active}
                    <Badge class="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Oui</Badge>
                  {:else}
                    <Badge variant="secondary" class="text-muted-foreground">Non</Badge>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right space-x-1">
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-primary" onclick={() => startEdit(cat)}>
                    <Edit class="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="h-8 w-8 text-muted-foreground hover:text-destructive" onclick={() => confirmDelete(cat.id)} disabled={isSubmitting}>
                    <Trash2 class="w-4 h-4" />
                  </Button>
                </Table.Cell>
              {/if}
            </Table.Row>
          {/each}
          {#if productCategories.length === 0}
            <Table.Row>
              <Table.Cell colspan={4} class="h-24 text-center text-muted-foreground">
                Aucune catégorie de produit trouvée.
              </Table.Cell>
            </Table.Row>
          {/if}
        </Table.Body>
      </Table.Root>
    </div>
  </Card.Content>
</Card.Root>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle Catégorie
      </Sheet.Title>
      <Sheet.Description>
        Ajoutez une catégorie pour classer les produits dans la boutique.
      </Sheet.Description>
    </Sheet.Header>
    <form class="space-y-6 pt-6" onsubmit={handleCreate}>
      <div class="space-y-2">
        <Label>Libellé de la catégorie</Label>
        <Input bind:value={newLabel} placeholder="Ex: Raquettes, Textile, Volants" required />
      </div>

      <div class="space-y-2">
        <Label>Catégorie Comptable associée</Label>
        <select bind:value={newAccountingCategoryId} required class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
          <option value={null} disabled>Sélectionner une catégorie...</option>
          {#each categories as c}
            <option value={c.id}>{c.adminLabel}</option>
          {/each}
        </select>
        <p class="text-xs text-muted-foreground">Les ventes de ces produits seront affectées à ce compte.</p>
      </div>

      <div class="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
        <div class="space-y-0.5">
          <Label class="text-base font-medium">Statut Actif</Label>
          <p class="text-xs text-muted-foreground">Rendre cette catégorie visible et utilisable.</p>
        </div>
        <Checkbox bind:checked={newActive} />
      </div>

      <Button type="submit" class="w-full font-bold" disabled={isSubmitting}>
        {isSubmitting ? 'Création...' : 'Créer la catégorie'}
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
