<script lang="ts">
  import { DataTable, Badge, Button, Table, DataTableToolbar, DataTableColumnHeader, Card } from '@nba/ui';
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
    }) => Promise<void>;
    onDeleteCategory: (id: number) => Promise<void>;
    tabsNav?: any;
    actions?: any;
  } = $props();

  const sortedCategories = $derived(
    [...categories].sort((a, b) => (a.adminLabel || '').localeCompare(b.adminLabel || '', 'fr', { sensitivity: 'base' }))
  );
</script>

<DataTable
  data={sortedCategories}
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
    <div class="flex flex-col gap-4">
      {#each sortedCategories as cat}
        {@const receiptClass = accountClasses?.find(ac => ac.id === cat.receiptAccountClassId || (cat.receiptCode && ac.code === cat.receiptCode))}
        {@const expenseClass = accountClasses?.find(ac => ac.id === cat.expenseAccountClassId || (cat.expenseCode && ac.code === cat.expenseCode))}
        <Card.Root class="flex flex-col gap-3 relative">
        <Card.Content class="p-4 flex flex-col gap-3">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="font-bold text-base text-foreground">{cat.adminLabel}</div>
              <div class="text-sm text-muted-foreground mt-0.5">{cat.adherentLabel}</div>
            </div>
            <div class="flex flex-col gap-1 items-end">
              {#if cat.active === false}
                <Badge variant="destructive" size="xs">Inactif</Badge>
              {:else}
                <Badge variant="success" size="xs">Actif</Badge>
              {/if}
              {#if cat.hideInExpenses}
                <Badge variant="warning" size="xs">Masquée NF</Badge>
              {/if}
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 mt-1">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-muted-foreground uppercase">Classe Recette</span>
              <span class="text-xs font-semibold">{receiptClass ? `${receiptClass.code} - ${receiptClass.label}` : (cat.receiptCode || 'N/A')}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-muted-foreground uppercase">Classe Dépense</span>
              <span class="text-xs font-semibold">{expenseClass ? `${expenseClass.code} - ${expenseClass.label}` : (cat.expenseCode || 'N/A')}</span>
            </div>
          </div>
          
          <div class="flex justify-end gap-2 pt-2 border-t border-border mt-1">
            <Button variant="outline" size="sm" class="h-8 text-xs flex-1" onclick={() => onEditCategory(cat)}>
              Modifier
            </Button>
          </div>
        </Card.Content>
        </Card.Root>
      {/each}
    </div>
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
