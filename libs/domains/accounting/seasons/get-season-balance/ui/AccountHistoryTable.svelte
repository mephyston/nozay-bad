<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import {
    Button,
    Badge,
    Amount,
    ChoiceField,
    DataTable,
    DataTableRowActions,
    DataTableToolbar,
    DropdownMenu,
    FilterSheet,
    FormField,
    RowActionItems,
    Table,
    dockDePage,
    softNavigate,
    toSeasonOptions,
    type SwipeAction
  } from '@nba/ui';
  import AccountList from './AccountList.svelte';
  import { gestesDeMouvement } from './account-row-model';
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
    onEdit,
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
    /** Rouvre le mouvement dans le formulaire ; un virement s'y rouvre entier. */
    onEdit?: (tx: AccountEntry) => void;
    onDelete: (id: number) => void;
    onAction?: (action: AccountAction) => void;
  } = $props();

  let filtresOuverts = $state(false);

  const seasonItems = $derived(
    (seasons.length > 0 ? toSeasonOptions(seasons) : [{ label: 'Saison 2025-2026', value: '25-26' }]).map(
      (o) => ({ value: String(o.value), label: o.label })
    )
  );

  // Le changement de saison recharge l'écran courant, quel que soit le compte affiché.
  function changeSeason(value: unknown) {
    const params = new URLSearchParams(window.location.search);
    params.set('season', String(value));
    softNavigate(`${window.location.pathname}?${params.toString()}`);
  }

  /*
    Les gestes pré-câblés du compte descendent dans la barre du bas. Ils vivaient
    derrière un bouton « Nouveau » posé en haut d'une barre d'outils qui défile, et dont
    le menu portait pour chacun une phrase d'explication — celle-ci reste, mais dans la
    feuille d'actions, où il y a la place de la lire.
  */
  $effect(() => {
    if (isClosed || !canWrite || !onAction || catalogue.length === 0) return;
    const liste: SwipeAction[] = catalogue.map((a) => ({
      id: a.key,
      label: a.label,
      icon: Plus,
      run: () => onAction(a)
    }));
    return dockDePage.declarerActions(liste, { icon: Plus, label: 'Nouveau mouvement' });
  });
</script>

{#snippet criteresDeListe()}
  <FormField id="filter-season" label="Saison">
    <ChoiceField
      id="filter-season"
      label="Saison"
      options={seasonItems}
      value={seasonId}
      onChange={changeSeason}
    />
  </FormField>
{/snippet}

<FilterSheet
  bind:open={filtresOuverts}
  description="La saison fixe le périmètre du compte."
  resultCount={filteredTransactions.length}
  itemName="mouvement"
>
  {@render criteresDeListe()}
</FilterSheet>

<DataTable
  data={filteredTransactions}
  mobileSpacing="list"
  emptyTitle="Aucun mouvement"
  emptyDescription="Aucun mouvement sur ce compte pour cette saison."
>
      {#snippet toolbar()}
        <DataTableToolbar
          bind:searchValue={searchTerm}
          searchPlaceholder="Rechercher un mouvement…"
          dockSearch
          hasFilters={true}
          filtersActive={false}
          onOpenFilters={() => (filtresOuverts = true)}
        >
          {#snippet filters()}
            <div class="space-y-4">
              {@render criteresDeListe()}
            </div>
          {/snippet}
          {#snippet actions()}
            <!-- Sur téléphone, ces gestes vivent dans la barre du bas. -->
            {#if onAction && catalogue.length > 0}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  {#snippet child({ props })}
                    <Button {...props} disabled={isClosed || !canWrite} class="hidden h-9 shrink-0 items-center gap-1.5 text-xs font-semibold md:flex">
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
      {#snippet mobileView()}
        <AccountList
          transactions={filteredTransactions}
          {accounts}
          {isClosed}
          {canWrite}
          {canDelete}
          {onEdit}
          {onDelete}
        />
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
            {#if tx.memberName}
              <a
                href={tx.memberLicence ? `/admin/members/${tx.memberLicence}` : undefined}
                class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline"
              >
                Adhérent : {tx.memberName}
              </a>
            {/if}
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
          <Table.Cell class="py-3 px-2 text-right relative">
            <!-- Modifier ou supprimer une jambe de virement porte sur le virement entier, ses deux jambes. -->
            {@const gestes = gestesDeMouvement(tx, { isClosed, canWrite, canDelete, onEdit, onDelete })}
            {#if gestes.length > 0}
              <DataTableRowActions>
                <DropdownMenu.Label>Actions</DropdownMenu.Label>
                <RowActionItems actions={gestes} item={tx} />
              </DataTableRowActions>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/snippet}
</DataTable>
