<script lang="ts">
  import { Trash2, Plus } from '@lucide/svelte';
  import { Button, Badge, Amount, DataTable, DataTableToolbar, DropdownMenu, FormField, SearchableCombobox, Table, softNavigate, toSeasonOptions } from '@nba/ui';
  import type { AccountEntry, Season } from './account-types';
  import type { AccountAction } from './account-actions';
  import { accountLabelOf, type AccountLike } from '../../../shared/account-labels';

  let {
    filteredTransactions = [],
    searchTerm = $bindable(''),
    isClosed,
    canWrite = true,
    canDelete = true,
    seasonId,
    seasons = [],
    accounts = [],
    catalogue = [],
    onDelete,
    onAction
  }: {
    filteredTransactions: AccountEntry[];
    searchTerm: string;
    isClosed: boolean;
    canWrite?: boolean;
    canDelete?: boolean;
    seasonId?: string;
    seasons?: Season[];
    /** Les comptes, pour nommer l'autre bout d'un virement. */
    accounts?: AccountLike[];
    /** Les gestes pré-câblés de ce compte : le bouton « Nouveau » les propose. */
    catalogue?: AccountAction[];
    onDelete: (id: number) => void;
    onAction?: (action: AccountAction) => void;
  } = $props();

  // Le changement de saison recharge l'écran courant, quel que soit le compte affiché.
  function changeSeason(value: unknown) {
    const params = new URLSearchParams(window.location.search);
    params.set('season', String(value));
    softNavigate(`${window.location.pathname}?${params.toString()}`);
  }
</script>

<DataTable
  data={filteredTransactions}
  emptyTitle="Aucun mouvement"
  emptyDescription="Aucun mouvement sur ce compte pour cette saison."
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
              <SearchableCombobox
                id="filter-season"
                items={seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]}
                value={seasonId}
                onValueChange={changeSeason}
              />
            </FormField>
          {/snippet}
          {#snippet actions()}
            {#if onAction && catalogue.length > 0}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  {#snippet child({ props })}
                    <Button {...props} disabled={isClosed || !canWrite} class="h-9 shrink-0 text-xs font-semibold flex items-center gap-1.5">
                      <Plus class="w-4 h-4" />
                      Nouveau
                    </Button>
                  {/snippet}
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" class="w-80">
                  {#each catalogue as action (action.key)}
                    <DropdownMenu.Item onclick={() => onAction(action)} class="flex flex-col items-start gap-0.5">
                      <span class="font-medium">{action.label}</span>
                      {#if action.hint}
                        <span class="text-xs text-muted-foreground whitespace-normal">{action.hint}</span>
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
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
                {tx.transferLeg === 'destination' ? 'depuis' : 'vers'} {accountLabelOf(accounts, tx.counterpartAccountId)}
              </Badge>
            {/if}
          </Table.Cell>
          <Table.Cell class="hidden sm:table-cell py-3 px-2 text-xs text-muted-foreground">
            {tx.category ?? 'Virement interne'}
          </Table.Cell>
          <Table.Cell class="py-3 px-2 text-right font-bold">
            {#if tx.type === 'recette' || (tx.type === 'transfert' && tx.transferLeg === 'destination')}
              <Amount cents={tx.amount} showSign colored />
            {:else}
              <Amount cents={-tx.amount} showSign colored />
            {/if}
          </Table.Cell>
          <Table.Cell class="py-3 px-2 text-right">
            <!-- Supprimer une jambe de virement supprime le virement entier, ses deux jambes. -->
            <Button
              variant="ghost"
              size="icon-xs"
              onclick={() => onDelete(tx.id)}
              class="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
              aria-label="Supprimer"
              disabled={isClosed || !canDelete}
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </Table.Cell>
        </Table.Row>
      {/snippet}
</DataTable>
