<script lang="ts">
  import { DataTable, Badge, Button, Table, DataTableToolbar, DataTableColumnHeader } from "@nba/ui";
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
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative">
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="font-bold text-base text-foreground">{cat.adminLabel}</div>
              <div class="text-sm text-muted-foreground mt-0.5">{cat.adherentLabel}</div>
            </div>
            <div class="flex flex-col gap-1 items-end">
              {#if cat.active === false}
                <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[10px] py-0 px-1 font-semibold">Inactif</Badge>
              {:else}
                <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-1 font-semibold">Actif</Badge>
              {/if}
              {#if cat.hideInExpenses}
                <Badge variant="outline" class="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0 px-1 font-semibold">Masquée NF</Badge>
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
        </div>
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
