<script lang="ts">
  import { Eye, MoreVertical, RefreshCw, FileText } from '@lucide/svelte';
  import { Button, Badge, Card, DropdownMenu, DataTable, Table, DataTableToolbar, DataTableColumnHeader } from '@nba/ui';
  import type { Expense } from './expenses-types';
  import { categoryColors } from './expenses-types';

  let {
    historyExpenses = [],
    isClosed = false,
    categoryLabels = {},
    searchTerm = $bindable(''),
    tabsNav,
    toolbarFilters,
    onSelectPhoto,
    onCancelValidation
  }: {
    historyExpenses: Expense[];
    isClosed?: boolean;
    categoryLabels: Record<string, string>;
    searchTerm: string;
    tabsNav?: any;
    toolbarFilters?: any;
    onSelectPhoto: (url: string) => void;
    onCancelValidation: (id: number) => void;
  } = $props();

</script>

<DataTable
  data={historyExpenses}
  emptyTitle="Aucun historique"
  emptyDescription="Les dépenses approuvées ou rejetées apparaîtront ici."
>
  {#snippet toolbarStart()}
    {#if tabsNav}
      {@render tabsNav()}
    {/if}
  {/snippet}

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
    </DataTableToolbar>
  {/snippet}

  {#snippet header()}
    <DataTableColumnHeader title="Date" />
    <DataTableColumnHeader title="Bénéficiaire" />
    <DataTableColumnHeader title="Motif" />
    <DataTableColumnHeader title="Catégorie" />
    <DataTableColumnHeader title="Montant" class="text-right" />
    <DataTableColumnHeader title="Justificatif" class="text-center" />
    <DataTableColumnHeader title="Statut" class="text-center" />
    <DataTableColumnHeader title="Actions" class="text-right" />
  {/snippet}

  {#snippet row(exp)}
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
      <Table.Cell class="p-4 text-center">
        {#if exp.status === 'approved'}
          <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            Remboursé
          </Badge>
        {:else}
          <Badge variant="outline" class="bg-destructive/10 text-destructive border border-destructive/20">
            Rejeté
          </Badge>
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
                  class="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" 
                  aria-label="Actions"
                >
                  <MoreVertical class="w-4 h-4" />
                  <span class="sr-only">Toggle menu</span>
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-44" align="end">
              <DropdownMenu.Item
                onclick={() => onCancelValidation(exp.id)}
                class="text-primary focus:text-primary cursor-pointer"
              >
                <RefreshCw class="w-3.5 h-3.5 mr-2" />
                Remettre en attente
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {:else}
          <span class="text-xs text-muted-foreground italic">Aucune</span>
        {/if}
      </Table.Cell>
    </Table.Row>
  {/snippet}

  {#snippet mobileView()}
    <div class="flex flex-col gap-4">
      {#each historyExpenses as exp (exp.id)}
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 relative shadow-sm">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-bold text-base text-foreground">{exp.emitterName}</div>
              <div class="text-xs text-muted-foreground mt-0.5">{new Date(exp.createdAt).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="font-outfit font-black text-primary text-lg">{(exp.amount / 100).toFixed(2)} €</span>
              {#if exp.status === 'approved'}
                <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5 py-0">
                  Remboursé
                </Badge>
              {:else}
                <Badge variant="outline" class="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5 py-0">
                  Rejeté
                </Badge>
              {/if}
            </div>
          </div>
          
          <div class="text-sm text-muted-foreground border border-border/50 bg-muted/20 rounded-md p-2">
            {exp.description}
          </div>
          
          <div class="flex justify-between items-center pt-2">
            <Badge variant="outline" class={categoryColors[exp.category] || 'bg-slate-500/10 text-slate-600 border-slate-500/20'}>
              {categoryLabels[exp.category] || exp.category}
            </Badge>
            
            <div class="flex gap-2 items-center">
              {#if exp.photoUrl}
                <Button variant="ghost" size="icon-sm" onclick={() => onSelectPhoto(exp.photoUrl!)} class="h-8 w-8 text-primary hover:bg-muted" title="Visualiser">
                  <Eye class="w-4 h-4" />
                </Button>
              {/if}
              {#if !isClosed}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    {#snippet child({ props })}
                      <Button 
                        {...props}
                        variant="ghost"
                        size="icon-sm"
                        class="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer" 
                      >
                        <MoreVertical class="w-4 h-4" />
                      </Button>
                    {/snippet}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content class="w-44" align="end">
                    <DropdownMenu.Item
                      onclick={() => onCancelValidation(exp.id)}
                      class="text-primary focus:text-primary cursor-pointer"
                    >
                      <RefreshCw class="w-3.5 h-3.5 mr-2" />
                      Remettre en attente
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/snippet}
</DataTable>
