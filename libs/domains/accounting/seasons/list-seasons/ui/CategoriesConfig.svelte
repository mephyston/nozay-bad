<script lang="ts">
  import { Settings, Plus } from "@lucide/svelte";
  import { Card } from "@nba/ui";
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
      code: string;
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<void>;
  } = $props();
</script>

<div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
  <!-- Categories List Table -->
  <Card.Root class="xl:col-span-2">
    <Card.Header>
      <Card.Title class="text-lg font-bold flex items-center gap-2">
        <Settings class="w-5 h-5 text-primary" />
        Gestion des Catégories de Trésorerie
      </Card.Title>
      <Card.Description>
        Configurez les libellés de comptabilité (Admin) et les libellés plus simples pour les notes de frais (Adhérent).
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <CategoryListTable
        {categories}
        {accountClasses}
        {isSubmitting}
        {onUpdateCategory}
        {onDeleteCategory}
      />
    </Card.Content>
  </Card.Root>

  <!-- Add Category Form -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-lg font-bold flex items-center gap-2">
        <Plus class="w-5 h-5 text-primary" />
        Nouvelle Catégorie
      </Card.Title>
      <Card.Description>
        Créez une nouvelle imputation pour les dépenses et recettes de l'asso.
      </Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
      <CategoryAddForm
        {accountClasses}
        {isSubmitting}
        {onCreateCategory}
      />
    </Card.Content>
  </Card.Root>
</div>
