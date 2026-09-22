<script lang="ts">
  import { Check, ChevronDown, ChevronRight } from '@lucide/svelte';
  import {
    Amount,
    Badge,
    DataTable,
    DataTableColumnHeader,
    DataTableRowActions,
    DropdownMenu,
    RowActionItems,
    Table
  } from '@nba/ui';
  import type { Transaction, Pagination } from './ledger-types';
  import { accountLabelOf, type AccountLike } from '../../../shared/account-labels';
  import LedgerList from './LedgerList.svelte';
  import {
    actionsDEcriture,
    estVentilation,
    grouperVentilations,
    libelleDeMois,
    moisDe,
    montantSigneCents,
    signalement
  } from './ledger-row-model';

  /**
   * Le journal des écritures, en table — la présentation de bureau.
   *
   * Sept colonnes et un menu par ligne : juste à la souris, qui vise au pixel et
   * dispose de la largeur. Sous 768 px, {@link LedgerList} prend le relais, avec des
   * sections mensuelles, un balayage et des groupes repliables.
   */
  let {
    transactions = [],
    pagination,
    accounts = [],
    activeCategories = [],
    isClosed,
    showBalance = true,
    selectedSeasonId,
    onStartEdit,
    onDelete,
    onChangePage,
    toolbar
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    /** Les comptes, pour nommer les deux bouts d'un virement. */
    accounts?: AccountLike[];
    activeCategories: { id: string; code: string; name: string }[];
    isClosed: boolean;
    /** Faux quand la liste est filtrée : le solde progressif et les soldes de fin de mois disparaissent. */
    showBalance?: boolean;
    selectedSeasonId?: number | string;
    onStartEdit: (tx: Transaction, e: MouseEvent) => void;
    onDelete: (id: number) => void;
    onChangePage?: (page: number) => void;
    toolbar?: import('svelte').Snippet;
  } = $props();

  const lignes = $derived(grouperVentilations(transactions));

  let expandedGroups = $state<Record<number, boolean>>({});
  const toggleGroup = (bankLineId: number) => {
    expandedGroups[bankLineId] = !expandedGroups[bankLineId];
  };
</script>

{#snippet desktopTxRow(tx: Transaction, isChild: boolean)}
  {@const marque = signalement(tx, selectedSeasonId)}
  {@const isOtherSeason = selectedSeasonId && String(tx.seasonId) !== String(selectedSeasonId)}
  <Table.Row
    id="tx-desktop-{tx.id}"
    class="{isChild ? 'bg-muted/5 relative border-l-4 border-l-primary/30' : ''} {isOtherSeason
      ? 'opacity-50 border-y border-dashed border-muted-foreground/40'
      : ''}"
  >
    <Table.Cell class="whitespace-nowrap {isChild ? 'pl-6 text-muted-foreground' : ''}">{tx.date}</Table.Cell>
    <!--
      Les badges se rangent en colonne, en petite taille : alignés en grande taille, le type,
      le cut-off et « autre exercice » élargissaient la table au-delà de l'écran.
    -->
    <Table.Cell class="align-top">
      <div class="flex flex-col items-start gap-1">
        {#if tx.type === 'recette'}
          <Badge variant="success" size="sm" shape="pill">Recette</Badge>
        {:else if tx.type === 'depense'}
          <Badge variant="destructive" size="sm" shape="pill">Dépense</Badge>
        {:else}
          <Badge variant="info" size="sm" shape="pill">
            {tx.transferLeg === 'destination' ? 'Virement reçu' : 'Virement émis'}
          </Badge>
        {/if}
        {#if marque}
          <Badge variant={marque.variant} size="xs" title={tx.accrualNote || marque.label}>{marque.label}</Badge>
        {/if}
      </div>
    </Table.Cell>
    <!--
      Un virement n'a pas de catégorie — le CHECK de la base l'interdit — mais il a deux comptes.
      La colonne se contentait d'afficher « Transfert » : sur un compte filtré, un virement
      entrant et un virement sortant étaient alors identiques à l'œil.
    -->
    <Table.Cell class="min-w-0 whitespace-normal">
      {#if tx.type === 'transfert'}
        <span class="block text-xs text-muted-foreground break-words">
          {#if tx.transferLeg === 'destination'}
            {accountLabelOf(accounts, tx.counterpartAccountId)} → {accountLabelOf(accounts, tx.accountId)}
          {:else}
            {accountLabelOf(accounts, tx.accountId)} → {accountLabelOf(accounts, tx.counterpartAccountId)}
          {/if}
        </span>
      {:else}
        {@const categoryName = tx.category
          ? (activeCategories.find((c) => c.id === String(tx.category))?.name || tx.category)
          : '—'}
        <span class="block break-words" title={categoryName}>{categoryName}</span>
      {/if}
    </Table.Cell>
    <Table.Cell class="font-medium min-w-0 whitespace-normal">
      <div class="line-clamp-2 break-words" title={tx.description}>{tx.description}</div>
      {#if tx.reference}
        <div class="text-xs text-muted-foreground italic truncate mt-0.5" title={tx.reference}>Réf: {tx.reference}</div>
      {/if}
      <div class="flex flex-wrap gap-1.5 mt-1">
        {#if tx.memberName}
          <a
            href={`/admin/members/${tx.memberLicence}`}
            class="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-semibold hover:underline"
          >
            Adhérent : {tx.memberName}
          </a>
        {/if}
        {#if tx.bankStatementLineId && !isChild}
          <Badge variant="success" size="xs" shape="square">
            <Check class="w-2.5 h-2.5" />
            Rapprochée
          </Badge>
        {/if}
      </div>
    </Table.Cell>
    <Table.Cell class="text-right font-bold whitespace-nowrap">
      <!-- Signé comme le reste : un virement déplace bien de l'argent sur le compte affiché. -->
      <Amount cents={montantSigneCents(tx)} showSign colored />
    </Table.Cell>
    {#if showBalance}
      <Table.Cell class="text-right whitespace-nowrap">
        {#if isChild}
          <span class="text-muted-foreground text-xs italic opacity-50">inclus</span>
        {:else if tx.runningBalanceCents !== undefined}
          <Amount cents={tx.runningBalanceCents} class="font-bold text-foreground" />
        {:else}
          <span class="text-muted-foreground">-</span>
        {/if}
      </Table.Cell>
    {/if}
    <Table.Cell class="text-right relative">
      {@const actions = actionsDEcriture(tx, { isClosed, onStartEdit, onDelete })}
      {#if actions.length > 0}
        <DataTableRowActions>
          <DropdownMenu.Label>Actions</DropdownMenu.Label>
          <RowActionItems {actions} item={tx} />
        </DataTableRowActions>
      {/if}
    </Table.Cell>
  </Table.Row>
{/snippet}

<DataTable
  data={lignes}
  tableClass="table-fixed min-w-[56rem]"
  mobileSpacing="list"
  {pagination}
  onPageChange={onChangePage}
  {toolbar}
  itemName="écriture(s)"
  emptyTitle="Aucune écriture"
  emptyDescription="Aucune écriture comptable pour cette saison."
>
  {#snippet mobileView()}
    <LedgerList
      items={lignes}
      {accounts}
      {activeCategories}
      {isClosed}
      {showBalance}
      {selectedSeasonId}
      bind:expandedGroups
      onToggleGroup={toggleGroup}
      {onStartEdit}
      {onDelete}
    />
  {/snippet}

  <!--
    Disposition fixe : les largeurs des en-têtes font foi, le libellé prend le reste et se
    tronque. Sous 56 rem, la table défile dans son cadre plutôt que d'écraser le libellé.
  -->
  {#snippet header()}
    <DataTableColumnHeader title="Date" class="w-24" />
    <DataTableColumnHeader title="Type" class="w-28" />
    <DataTableColumnHeader title="Catégorie" class="w-36" />
    <DataTableColumnHeader title="Libellé" />
    <DataTableColumnHeader title="Montant" class="w-24 text-right" />
    {#if showBalance}
      <DataTableColumnHeader title="Solde" class="w-28 text-right" />
    {/if}
    <DataTableColumnHeader title="" class="w-12" />
  {/snippet}

  {#snippet row(item, i)}
    {#if showBalance && i > 0 && moisDe(item.date) !== moisDe(lignes[i - 1].date) && item.runningBalanceCents !== undefined}
      <!-- La liste descend dans le temps : au changement de mois, la ligne courante est la
           dernière du mois écoulé, et son solde progressif en est la clôture. -->
      <Table.Row class="bg-muted/20 hover:bg-muted/20">
        <Table.Cell colspan={5} class="text-right font-bold text-muted-foreground uppercase text-xs tracking-wider py-3">
          Solde fin {libelleDeMois(moisDe(item.date))}
        </Table.Cell>
        <Table.Cell class="text-right font-bold py-3 text-muted-foreground">
          <Amount cents={item.runningBalanceCents} />
        </Table.Cell>
        <Table.Cell class="py-3"></Table.Cell>
      </Table.Row>
    {/if}

    {#if estVentilation(item)}
      <Table.Row
        class="bg-muted/10 hover:bg-muted/20 cursor-pointer group"
        onclick={() => toggleGroup(item.bankStatementLineId)}
      >
        <Table.Cell>{item.date}</Table.Cell>
        <Table.Cell>
          {#if item.type === 'recette'}
            <Badge variant="success" size="sm" shape="pill">Recette</Badge>
          {:else if item.type === 'depense'}
            <Badge variant="destructive" size="sm" shape="pill">Dépense</Badge>
          {:else}
            <Badge variant="info" size="sm" shape="pill">Transfert</Badge>
          {/if}
        </Table.Cell>
        <Table.Cell class="font-medium text-foreground">
          <div class="flex items-center gap-2">
            <div class="bg-background rounded p-1 shadow-sm border border-border">
              {#if expandedGroups[item.bankStatementLineId]}
                <ChevronDown class="w-3 h-3 text-primary" />
              {:else}
                <ChevronRight class="w-3 h-3 text-primary" />
              {/if}
            </div>
            Ventilation ({item.children.length})
          </div>
        </Table.Cell>
        <Table.Cell class="text-muted-foreground min-w-0 whitespace-normal">
          <div class="line-clamp-2 break-words" title={item.description}>{item.description}</div>
          {#if item.reference}
            <div class="text-xs italic truncate mt-0.5">Réf: {item.reference}</div>
          {/if}
          <div class="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="success" size="xs" shape="square">
              <Check class="w-2.5 h-2.5" />
              Rapprochée
            </Badge>
          </div>
        </Table.Cell>
        <Table.Cell class="text-right font-bold">
          <Amount cents={item.type === 'depense' ? -item.amountCents : item.amountCents} showSign colored />
        </Table.Cell>
        {#if showBalance}
          <Table.Cell class="text-right">
            <Amount cents={item.runningBalanceCents} class="font-bold text-foreground" />
          </Table.Cell>
        {/if}
        <Table.Cell class="text-right text-xs text-muted-foreground whitespace-nowrap">
          {#if !expandedGroups[item.bankStatementLineId]}
            Cliquez pour détailler
          {/if}
        </Table.Cell>
      </Table.Row>

      {#if expandedGroups[item.bankStatementLineId]}
        {#each item.children as tx (tx.id)}
          {@render desktopTxRow(tx, true)}
        {/each}
      {/if}
    {:else}
      {@render desktopTxRow(item as Transaction, false)}
    {/if}
  {/snippet}
</DataTable>
