<script lang="ts">
  import { FileText, Search, Trash2, Plus } from '@lucide/svelte';
  import { Button, Badge, Amount, DataTable, DataTableToolbar, FormField } from '@nba/ui';
  import { Table } from '@nba/ui';
  import type { CashTransaction, Season } from './cashbox-types';
  import { categoryLabels } from './cashbox-types';

  let {
    filteredTransactions = [],
    searchTerm = $bindable(''),
    isClosed,
    seasonId,
    seasons = [],
    onDelete,
    onNewMovement
  }: {
    filteredTransactions: CashTransaction[];
    searchTerm: string;
    isClosed: boolean;
    seasonId?: string;
    seasons?: Season[];
    onDelete: (id: number) => void;
    onNewMovement?: () => void;
  } = $props();
</script>

<DataTable
  data={filteredTransactions}
  emptyTitle="Aucun mouvement"
  emptyDescription="Aucun mouvement de caisse pour cette saison."
>
      {#snippet toolbar()}
        <DataTableToolbar
          bind:searchValue={searchTerm}
          searchPlaceholder="Rechercher..."
          hasFilters={true}
          filtersActive={!!seasonId && seasons.length > 0}
        >
          {#snippet filters()}
              <FormField id="filter-season" label="Saison">
              <select
                id="filter-season"
                class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                value={seasonId}
                onchange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  const params = new URLSearchParams(window.location.search);
                  params.set('season', val);
                  window.location.href = `/admin/accounting/cash-box?${params.toString()}`;
                }}
              >
                {#each seasons as season}
                  <option value={season.code || season.id}>{season.name}</option>
                {/each}
                {#if seasons.length === 0}
                  <option value="25-26">Saison 2025-2026</option>
                {/if}
              </select>
            </FormField>
          {/snippet}
          {#snippet actions()}
            {#if onNewMovement}
              <Button
                onclick={onNewMovement}
                disabled={isClosed}
                class="h-9 shrink-0 text-xs font-semibold"
              >
                Nouveau
              </Button>
            {/if}
          {/snippet}
        </DataTableToolbar>
      {/snippet}
      {#snippet header()}
        <Table.Head class="hidden md:table-cell py-3 px-2">Date</Table.Head>
        <Table.Head class="py-3 px-2">Description</Table.Head>
        <Table.Head class="hidden sm:table-cell py-3 px-2">Catégorie</Table.Head>
        <Table.Head class="py-3 px-2 text-right">Montant</Table.Head>
        <Table.Head class="py-3 px-2 text-right">Action</Table.Head>
      {/snippet}
      
      {#snippet row(tx)}
        <Table.Row class="hover:bg-muted/40 transition-colors">
          <Table.Cell class="hidden md:table-cell py-3 px-2 text-xs whitespace-nowrap">{tx.date}</Table.Cell>
          <Table.Cell class="py-3 px-2 font-medium">
            <div>{tx.description}</div>
            {#if tx.type === 'transfert'}
              <Badge variant="primary-soft" size="xs" class="uppercase">
                Virement interne
              </Badge>
            {/if}
          </Table.Cell>
          <Table.Cell class="hidden sm:table-cell py-3 px-2 text-xs text-muted-foreground">
            {tx.category ? (categoryLabels[tx.category] || tx.category) : 'Transfert'}
          </Table.Cell>
          <Table.Cell class="py-3 px-2 text-right font-bold">
            {#if tx.type === 'recette'}
              <Amount cents={tx.amount} showSign colored />
            {:else if tx.type === 'depense'}
              <Amount cents={-tx.amount} showSign colored />
            {:else if tx.type === 'transfert' && tx.destinationAccountId === 'cash'}
              <Amount cents={tx.amount} showSign colored />
            {:else}
              <Amount cents={-tx.amount} showSign colored />
            {/if}
          </Table.Cell>
          <Table.Cell class="py-3 px-2 text-right">
            {#if tx.type !== 'transfert'}
              <Button
                variant="ghost"
                size="icon-xs"
                onclick={() => onDelete(tx.id)}
                class="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                aria-label="Supprimer"
                disabled={isClosed}
              >
                <Trash2 class="w-4 h-4" />
              </Button>
            {:else}
              <span class="text-[10px] text-muted-foreground italic">Protégé</span>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/snippet}
</DataTable>
