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
    onCreateCategory
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
  } = $props();

  let showAddSheet = $state(false);

  async function handleCreate(data: Parameters<typeof onCreateCategory>[0]) {
    await onCreateCategory(data);
    showAddSheet = false;
  }
</script>

<Card.Root class="w-full">
  <Card.Header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
    <div>
      <Card.Title class="text-lg font-bold flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Gestion des Catégories de Trésorerie
      </Card.Title>
      <Card.Description class="mt-1">
        Configurez les libellés de comptabilité (Admin) et les libellés plus simples pour les notes de frais (Adhérent).
      </Card.Description>
    </div>
    <Button onclick={() => showAddSheet = true} size="sm" class="font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
      <Plus class="w-4 h-4" />
      Nouvelle Catégorie
    </Button>
  </Card.Header>
  <Card.Content class="pt-6 space-y-6">
    <CategoryListTable
      {categories}
      {accountClasses}
      {isSubmitting}
      {onUpdateCategory}
      {onDeleteCategory}
    />
  </Card.Content>
</Card.Root>

<Sheet.Root bind:open={showAddSheet}>
  <Sheet.Content class="w-full sm:max-w-md p-6 bg-card border-border overflow-y-auto">
    <Sheet.Header>
      <Sheet.Title class="flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle Catégorie
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
