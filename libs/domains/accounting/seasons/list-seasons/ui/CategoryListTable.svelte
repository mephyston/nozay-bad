<script lang="ts">
  import { DataTable, DataTableToolbar, DataTableColumnHeader } from '@nba/ui';
  import CategoryList from './CategoryList.svelte';
  import { parLibelle } from './config-row-model';
  import type { Category, AccountClass } from "./settings-types";
  import CategoryRow from "./CategoryRow.svelte";

  let {
    categories = [],
    accountClasses = [],
    isSubmitting = false,
    onEditCategory,
    onUpdateCategory,
    onDeleteCategory,
    tabsNav,
    actions
  }: {
    categories: Category[];
    accountClasses?: AccountClass[];
    isSubmitting: boolean;
    onEditCategory: (cat: Category) => void;
    onUpdateCategory: (id: number, updates: {
      adminLabel: string;
      adherentLabel: string;
      hideInExpenses: boolean;
      receiptCode: string | null;
      expenseCode: string | null;
    }) => Promise<boolean>;
    onDeleteCategory: (id: number) => Promise<boolean>;
    tabsNav?: any;
    actions?: any;
  } = $props();

  const sortedCategories = $derived(parLibelle(categories));
</script>

<DataTable
  data={sortedCategories}
  mobileSpacing="list"
  emptyTitle="Aucune catégorie"
  emptyDescription="Aucune catégorie trouvée."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}

  {#snippet toolbar()}
    <DataTableToolbar hasSearch={false} {actions} />
  {/snippet}

  {#snippet mobileView()}
    <CategoryList categories={sortedCategories} {accountClasses} onEdit={onEditCategory} />
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="Libellé Admin (Compta)" />
    <DataTableColumnHeader title="Libellé Adhérent (Notes de Frais)" />
    <DataTableColumnHeader title="Classe Recette (CR)" />
    <DataTableColumnHeader title="Classe Dépense (CD)" />
    <DataTableColumnHeader title="Notes de frais ?" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}
  
  {#snippet row(cat)}
    <CategoryRow
      {cat}
      {accountClasses}
      {isSubmitting}
      {onEditCategory}
      {onUpdateCategory}
      {onDeleteCategory}
    />
  {/snippet}
</DataTable>
