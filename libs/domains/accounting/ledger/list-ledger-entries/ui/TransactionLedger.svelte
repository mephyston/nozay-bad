<script lang="ts">
  import { onMount } from 'svelte';
  import { Tabs } from '@nba/ui';
  import type { Transaction, Pagination, BalanceReport, Season, Category, AccountClass } from './ledger-types';
  import { getPageRange } from './ledger-utils';
  import { submitTransaction, deleteTransaction, changePage as actionChangePage, applySeasonChange as actionApplySeasonChange } from './ledger-actions';
  import TransactionLedgerBalances from './TransactionLedgerBalances.svelte';
  import TransactionLedgerHeader from './TransactionLedgerHeader.svelte';
  import TransactionLedgerTable from './TransactionLedgerTable.svelte';
  import TransactionFormSheet from './TransactionFormSheet.svelte';

  export * from './ledger-types';
  export * from './ledger-utils';
  export * from './ledger-actions';

  let {
    transactions = [],
    pagination,
    seasonId,
    balances = [],
    seasons = [],
    categories = [],
    accountClasses = [],
    unreconciledChequesOnly = false,
    accountId = ''
  }: {
    transactions: Transaction[];
    pagination: Pagination;
    seasonId: string;
    balances: BalanceReport[];
    seasons?: Season[];
    categories?: Category[];
    accountClasses?: AccountClass[];
    unreconciledChequesOnly?: boolean;
    accountId?: string;
  } = $props();

  let pageRange = $derived(getPageRange(pagination.page, pagination.totalPages));

  // svelte-ignore state_referenced_locally
  let selectedAccount = $state(accountId || 'all');

  $effect(() => {
    if (selectedAccount !== (accountId || 'all')) {
      const params = new URLSearchParams(window.location.search);
      if (selectedAccount === 'all') params.delete('accountId');
      else params.set('accountId', selectedAccount);
      params.set('page', '1');
      window.location.href = `/admin/accounting?${params.toString()}`;
    }
  });

  let filteredCategory = $state<string | null>(null);
  let filteredClassCode = $state<string | null>(null);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    filteredCategory = params.get('category');
    filteredClassCode = params.get('classCode');
  });

  function clearFilters() {
    const params = new URLSearchParams(window.location.search);
    params.delete('category');
    params.delete('classCode');
    params.set('page', '1');
    window.location.href = `/admin/accounting?${params.toString()}`;
  }

  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let open = $state(false);
  $effect(() => { open = showPanel !== null; });
  $effect(() => { if (!open) showPanel = null; });

  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('1');
  let formAccountId = $state<'current' | 'savings' | 'cash'>('current');
  let destinationAccountId = $state<'current' | 'savings' | 'cash'>('cash');
  let paymentMethod = $state('virement');
  let description = $state('');
  let reference = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  // svelte-ignore state_referenced_locally
  let targetSeasonId = $state(seasonId);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);
  const activeCategories = $derived(categories.map(c => ({ id: String(c.id), code: c.code, name: c.adminLabel })));

  let editingId = $state<number | null>(null);

  function openPanel(type: 'recette' | 'depense' | 'transfert') {
    showPanel = type;
    amount = '';
    description = '';
    targetSeasonId = selectedSeason;
    editingId = null;
  }

  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    editingId = tx.id;
    amount = (tx.amount / 100).toFixed(2);
    date = tx.date;
    category = tx.category || '1';
    formAccountId = tx.accountId;
    destinationAccountId = tx.destinationAccountId || 'cash';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
  }

  async function handleAddTransaction(e: Event) {
    isSubmitting = true;
    errorMsg = '';
    try {
      await submitTransaction(e, { editingId, showPanel, amount, date, category, formAccountId, destinationAccountId, paymentMethod, description, reference, targetSeasonId });
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTransaction(id);
      toast.success('Écriture supprimée avec succès !');
    } catch (err: any) {
      toast.error(err.message);
    }
  }
</script>

<div class="space-y-6">
  <TransactionLedgerBalances {balances} />

  <TransactionLedgerHeader
    bind:selectedSeason
    {seasons}
    {isClosed}
    {filteredCategory}
    {filteredClassCode}
    {categories}
    {accountClasses}
    {unreconciledChequesOnly}
    onOpenPanel={openPanel}
    onApplySeasonChange={() => actionApplySeasonChange(selectedSeason)}
    onClearFilters={clearFilters}
  />

  <Tabs.Root bind:value={selectedAccount} class="w-full no-print">
    <Tabs.List class="grid w-full grid-cols-2 sm:grid-cols-4 max-w-2xl mx-auto">
      <Tabs.Trigger value="all" onclick={() => selectedAccount = 'all'}>Tous les comptes</Tabs.Trigger>
      <Tabs.Trigger value="current" onclick={() => selectedAccount = 'current'}>Compte Courant</Tabs.Trigger>
      <Tabs.Trigger value="savings" onclick={() => selectedAccount = 'savings'}>Compte Livret</Tabs.Trigger>
      <Tabs.Trigger value="cash" onclick={() => selectedAccount = 'cash'}>Caisse Physique</Tabs.Trigger>
    </Tabs.List>
  </Tabs.Root>

  <TransactionLedgerTable
    {transactions}
    {pagination}
    {activeCategories}
    {isClosed}
    {pageRange}
    onStartEdit={startEdit}
    onDelete={handleDelete}
    onChangePage={(p) => actionChangePage(p, pagination.totalPages)}
  />

  <TransactionFormSheet
    bind:open
    bind:showPanel
    {editingId}
    bind:amount
    bind:date
    bind:category
    bind:formAccountId
    bind:destinationAccountId
    bind:paymentMethod
    bind:description
    bind:reference
    bind:targetSeasonId
    {seasons}
    {activeCategories}
    bind:isSubmitting
    bind:errorMsg
    onSubmit={handleAddTransaction}
  />
</div>
