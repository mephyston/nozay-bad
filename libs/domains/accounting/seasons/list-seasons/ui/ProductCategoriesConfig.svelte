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

  async function handleSaveEdit(e: Event) {
    e.preventDefault();
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

<div class="w-full space-y-6">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h2 class="text-lg font-bold flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Catégories de Produits
      </h2>
      <p class="text-sm text-muted-foreground mt-1">
        Associez des catégories de produits à des catégories comptables pour générer la comptabilité des commandes.
      </p>
    </div>
    <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
      <Plus class="w-4 h-4" />
      Nouvelle Catégorie
    </Button>
  </div>
  <div>
    <div class="hidden sm:block rounded-md border border-border overflow-hidden">
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50 hover:bg-muted/50">
            <Table.Head class="font-semibold h-10 w-full sm:w-[300px]">Libellé</Table.Head>
            <Table.Head class="font-semibold h-10 hidden sm:table-cell">Catégorie Comptable</Table.Head>
            <Table.Head class="font-semibold h-10 w-[100px] text-center hidden md:table-cell">Actif</Table.Head>
            <Table.Head class="font-semibold h-10 w-[120px] text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each productCategories as cat}
            <Table.Row class="hover:bg-muted/30">
                <Table.Cell class="font-medium">
                  {cat.label}
                </Table.Cell>
                <Table.Cell class="hidden sm:table-cell">
                  <Badge variant="outline" class="font-normal bg-card">
                    {getCategoryLabel(cat.accountingCategoryId)}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-center hidden md:table-cell">
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
    <div class="sm:hidden flex flex-col gap-4 mt-4">
      {#each productCategories as cat}
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="font-bold text-base text-foreground">{cat.label}</div>
              <div class="text-sm text-muted-foreground mt-0.5">
                <Badge variant="outline" class="font-normal bg-card">
                  {getCategoryLabel(cat.accountingCategoryId)}
                </Badge>
              </div>
            </div>
            <div>
              {#if cat.active}
                <Badge class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0 px-1 font-semibold">Actif</Badge>
              {:else}
                <Badge variant="secondary" class="text-[10px] py-0 px-1 font-semibold">Inactif</Badge>
              {/if}
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2 border-t border-border mt-1">
            <Button variant="outline" size="sm" class="h-8 text-xs flex-1 border-destructive/20 text-destructive hover:bg-destructive/10" onclick={() => confirmDelete(cat.id)} disabled={isSubmitting}>
              Supprimer
            </Button>
            <Button variant="outline" size="sm" class="h-8 text-xs flex-1" onclick={() => startEdit(cat)}>
              Modifier
            </Button>
          </div>
        </div>
      {/each}
      {#if productCategories.length === 0}
        <div class="p-8 text-center text-muted-foreground border border-border rounded-xl bg-card">
          Aucune catégorie de produit définie.
        </div>
      {/if}
    </div>
  </div>
</div>

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

<Sheet.Root open={!!editingId} onOpenChange={(o) => { if (!o) editingId = null; }}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Edit class="w-5 h-5 text-primary" />
        Modifier la Catégorie
      </Sheet.Title>
      <Sheet.Description>
        Modifiez le libellé ou la catégorie comptable associée.
      </Sheet.Description>
    </Sheet.Header>
    <form class="space-y-6 pt-6" onsubmit={handleSaveEdit}>
      <div class="space-y-2">
        <Label>Libellé de la catégorie</Label>
        <Input bind:value={editLabel} required />
      </div>

      <div class="space-y-2">
        <Label>Catégorie Comptable associée</Label>
        <select bind:value={editAccountingCategoryId} required class="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
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
        <Checkbox bind:checked={editActive} />
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
