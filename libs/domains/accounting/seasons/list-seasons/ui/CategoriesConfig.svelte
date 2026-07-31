<script lang="ts">
  import { Settings, Plus } from "@lucide/svelte";
  import { Card, Button, Sheet } from "@nba/ui";
  import type { Category, AccountClass } from "./settings-types";
  import CategoryListTable from "./CategoryListTable.svelte";
  import CategoryAddForm from "./CategoryAddForm.svelte";

  let {
    categories = [],
    accountClasses = [],
    isSubmitting = false,
    onUpdateCategory,
    onDeleteCategory,
    onCreateCategory,
    tabsNav
  }: {
    categories: Category[];
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
    onCreateCategory: (data: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<void>;
    tabsNav?: any;
  } = $props();

  let showAddSheet = $state(false);
  let editingCategory = $state<Category | null>(null);

  async function handleCreate(data: Parameters<typeof onCreateCategory>[0]) {
    await onCreateCategory(data);
    showAddSheet = false;
  }

  async function handleUpdate(data: Parameters<typeof onUpdateCategory>[1]) {
    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, data);
      editingCategory = null;
    }
  }
</script>

<div class="space-y-6">
  <CategoryListTable
    {categories}
    {accountClasses}
    {isSubmitting}
    onEditCategory={(cat) => editingCategory = cat}
    {onUpdateCategory}
    {onDeleteCategory}
    {tabsNav}
  >
    {#snippet actions()}
      <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
        <Plus class="w-4 h-4" />
        Nouvelle catégorie
      </Button>
    {/snippet}
  </CategoryListTable>
</div>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle catégorie
      </Sheet.Title>
      <Sheet.Description>
        Créez une nouvelle imputation pour les dépenses et recettes de l'asso.
      </Sheet.Description>
    </Sheet.Header>
    <div class="pt-4">
      <CategoryAddForm
        {accountClasses}
        {isSubmitting}
        onCreateCategory={handleCreate}
      />
    </div>
  </Sheet.Content>
</Sheet.Root>

<Sheet.Root open={!!editingCategory} onOpenChange={(o) => { if (!o) editingCategory = null; }}>
  <Sheet.Content size="md" class="overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Modifier la catégorie
      </Sheet.Title>
      <Sheet.Description>
        Mettez à jour les libellés ou les classes comptables par défaut.
      </Sheet.Description>
    </Sheet.Header>
    <div class="pt-4">
      {#if editingCategory}
        <CategoryAddForm
          {accountClasses}
          {isSubmitting}
          initialData={editingCategory}
          onSubmitCategory={handleUpdate}
        />
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>
