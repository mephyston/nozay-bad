<script lang="ts">
  import { Eye, Check, X, FileText, Edit2, MoreVertical } from '@lucide/svelte';
  import { Button, Badge, DataTable, Table, DataTableToolbar, DataTableColumnHeader, DropdownMenu } from '@nba/ui';
  import type { Expense, Season, CategoryOption } from './expenses-types';
  import { categoryColors } from './expenses-types';
  import ExpensePendingEditCard from './ExpensePendingEditCard.svelte';
  import ExpensePendingViewCard from './ExpensePendingViewCard.svelte';

  let {
    pendingExpenses = [],
    isClosed = false,
    submittingId = null,
    editingId = $bindable(null),
    editDescription = $bindable(''),
    editCategory = $bindable(''),
    editSeasonId = $bindable(''),
    editAmountStr = $bindable(''),
    isSaving = false,
    categoriesList = [],
    categoryLabels = {},
    seasons = [],
    searchTerm = $bindable(''),
    toolbarFilters,
    toolbarActions,
    onSelectPhoto,
    onStartEdit,
    onSaveEdit,
    onAction
  }: {
    pendingExpenses: Expense[];
    isClosed?: boolean;
    submittingId: number | null;
    editingId: number | null;
    editDescription: string;
    editCategory: string;
    editSeasonId: string;
    editAmountStr: string;
    isSaving: boolean;
    categoriesList: CategoryOption[];
    categoryLabels: Record<string, string>;
    seasons: Season[];
    searchTerm: string;
    toolbarFilters?: any;
    toolbarActions?: any;
    onSelectPhoto: (url: string) => void;
    onStartEdit: (exp: Expense) => void;
    onSaveEdit: (id: number) => void;
    onAction: (id: number, action: 'approve' | 'reject') => void;
  } = $props();
</script>

<DataTable
  data={pendingExpenses}
  emptyTitle="Aucune note de frais en attente"
  emptyDescription="Toutes les dépenses soumises ont été validées ou rejetées."
>

  {#snippet toolbar()}
    <DataTableToolbar 
      bind:searchValue={searchTerm} 
      hasFilters={!!toolbarFilters}
      filtersActive={true}
    >
      {#snippet filters()}
        {#if toolbarFilters}
          {@render toolbarFilters()}
        {/if}
      {/snippet}
      {#snippet actions()}
        {#if toolbarActions}
          {@render toolbarActions()}
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="Date" />
    <DataTableColumnHeader title="Bénéficiaire" />
    <DataTableColumnHeader title="Motif" />
    <DataTableColumnHeader title="Catégorie" />
    <DataTableColumnHeader title="Montant" class="text-right" />
    <DataTableColumnHeader title="Justificatif" class="text-center" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}

  {#snippet row(exp)}
    {#if editingId === exp.id}
      <Table.Row>
        <Table.Cell colspan={7} class="p-0">
          <ExpensePendingEditCard
            {exp}
            bind:editDescription
            bind:editCategory
            bind:editSeasonId
            bind:editAmountStr
            {isSaving}
            {categoriesList}
            {seasons}
            {onSelectPhoto}
            onCancelEdit={() => editingId = null}
            {onSaveEdit}
          />
        </Table.Cell>
      </Table.Row>
    {:else}
      <Table.Row class="hover:bg-muted/50 transition-colors">
        <Table.Cell class="p-4 text-muted-foreground whitespace-nowrap">
          {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
        </Table.Cell>
        <Table.Cell class="p-4 font-bold text-foreground">
          {exp.emitterName}
        </Table.Cell>
        <Table.Cell class="p-4 max-w-xs truncate" title={exp.description}>
          {exp.description}
        </Table.Cell>
        <Table.Cell class="p-4">
          <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}>
            {categoryLabels[exp.category] || exp.category}
          </Badge>
        </Table.Cell>
        <Table.Cell class="p-4 font-outfit tabular-nums font-bold text-foreground text-right">
          {(exp.amount / 100).toFixed(2)} €
        </Table.Cell>
        <Table.Cell class="p-4 text-center">
          {#if exp.photoUrl}
            <Button
              variant="ghost"
              size="sm"
              onclick={() => onSelectPhoto(exp.photoUrl!)}
              class="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 h-auto py-1 px-2"
            >
              <Eye class="w-3.5 h-3.5" />
              Voir
            </Button>
          {:else}
            <span class="text-xs text-muted-foreground">Aucun</span>
          {/if}
        </Table.Cell>
        <Table.Cell class="p-4 text-right">
          {#if !isClosed}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                {#snippet child({ props })}
                  <Button
                    {...props}
                    variant="ghost"
                    size="icon-sm"
                    disabled={submittingId !== null}
                    class="text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <MoreVertical class="w-4 h-4" />
                    <span class="sr-only">Actions</span>
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="w-44" align="end">
                <DropdownMenu.Item onclick={() => onStartEdit(exp)} class="cursor-pointer">
                  <Edit2 class="w-4 h-4 mr-2" />
                  Modifier
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item 
                  onclick={() => onAction(exp.id, 'reject')} 
                  class="text-destructive focus:text-destructive cursor-pointer"
                >
                  <X class="w-4 h-4 mr-2" />
                  Rejeter
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onclick={() => onAction(exp.id, 'approve')} 
                  class="text-success focus:text-success cursor-pointer"
                >
                  <Check class="w-4 h-4 mr-2" />
                  Valider
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {/if}
        </Table.Cell>
      </Table.Row>
    {/if}
  {/snippet}

  {#snippet mobileView()}
    <div class="flex flex-col gap-4">
      {#each pendingExpenses as exp (exp.id)}
        {#if editingId === exp.id}
          <ExpensePendingEditCard
            {exp}
            {isSaving}
            bind:editDescription
            bind:editCategory
            bind:editSeasonId
            bind:editAmountStr
            {categoriesList}
            {seasons}
            onCancelEdit={() => editingId = null}
            {onSaveEdit}
            {onSelectPhoto}
          />
        {:else}
          <ExpensePendingViewCard
            {exp}
            {isClosed}
            {submittingId}
            {categoryLabels}
            {onSelectPhoto}
            {onAction}
            {onStartEdit}
          />
        {/if}
      {/each}
    </div>
  {/snippet}
</DataTable>
