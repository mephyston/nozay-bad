<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, X, Filter } from '@lucide/svelte';
  import { Button, Dialog, Sheet, Tabs, Input, DropdownMenu, Checkbox, AlertDialog } from '@nba/ui';
  import type { Transaction, Pagination, BalanceReport, Season, Category, AccountClass } from './ledger-types';
  import { submitTransaction, deleteTransaction, changePage as actionChangePage, applySeasonChange as actionApplySeasonChange } from './ledger-actions';
  import TransactionLedgerBalances from './TransactionLedgerBalances.svelte';
  import TransactionLedgerHeader from './TransactionLedgerHeader.svelte';
  import TransactionLedgerTable from './TransactionLedgerTable.svelte';
  import TransactionFormSheet from './TransactionFormSheet.svelte';

  export * from './ledger-types';
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
    accountId = '',
    searchQuery = '',
    month = '',
    limit = '20'
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
    searchQuery?: string;
    month?: string;
    limit?: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedAccount = $state(accountId || 'current');

  $effect(() => {
    if (selectedAccount !== (accountId || 'current')) {
      const params = new URLSearchParams(window.location.search);
      params.set('accountId', selectedAccount);
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

  $effect(() => {
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const scrollToTx = sessionStorage.getItem('scrollToTx');
    if (scrollToTx && transactions.length > 0) {
      sessionStorage.removeItem('scrollToTx');
      const tryScroll = (highlight = false) => {
        const isMobile = window.innerWidth < 640;
        const el = document.getElementById(isMobile ? `tx-mobile-${scrollToTx}` : `tx-desktop-${scrollToTx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (highlight) {
            el.classList.add('bg-muted', 'transition-colors', 'duration-1000');
            setTimeout(() => el.classList.remove('bg-muted'), 2000);
          }
        }
      };
      setTimeout(() => tryScroll(true), 100);
      setTimeout(() => tryScroll(false), 600);
    }

    const scrollYStr = sessionStorage.getItem('ledger_scroll_y');
    if (scrollYStr && transactions.length > 0) {
      sessionStorage.removeItem('ledger_scroll_y');
      const targetY = parseInt(scrollYStr);
      setTimeout(() => window.scrollTo({ top: targetY, behavior: 'instant' }), 100);
      setTimeout(() => window.scrollTo({ top: targetY, behavior: 'instant' }), 600);
    }
  });

  function clearFilters() {
    const params = new URLSearchParams(window.location.search);
    params.delete('category');
    params.delete('classCode');
    params.delete('month');
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
  let accrualType = $state('normal');
  let accrualNote = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  // svelte-ignore state_referenced_locally
  let selectedSeason = $state(seasonId);
  // svelte-ignore state_referenced_locally
  let targetSeasonId = $state(seasonId);

  const isClosed = $derived(seasons.find(s => s.id === selectedSeason)?.closed || false);
  const activeCategories = $derived(
    categories
      .filter(c => c.active !== false || (editingId && String(c.id) === category))
      .map(c => ({ id: String(c.id), code: c.code, name: c.adminLabel }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }))
  );

  let editingId = $state<number | null>(null);

  function openPanel(type: 'recette' | 'depense' | 'transfert') {
    showPanel = type;
    amount = '';
    description = '';
    accrualType = 'normal';
    accrualNote = '';
    targetSeasonId = selectedSeason;
    editingId = null;
  }

  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    editingId = tx.id;
    const reverseAccountMap: Record<number | string, 'current' | 'savings' | 'cash'> = {
      1: 'current',
      2: 'savings',
      3: 'cash',
      'current': 'current',
      'savings': 'savings',
      'cash': 'cash'
    };

    amount = (tx.amount / 100).toFixed(2);
    date = tx.date;
    category = tx.category ? String(tx.category) : '1';
    formAccountId = reverseAccountMap[tx.accountId as any] || 'current';
    destinationAccountId = reverseAccountMap[tx.destinationAccountId as any] || 'cash';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    accrualType = (tx as any).accrualType || 'normal';
    accrualNote = (tx as any).accrualNote || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
  }

  async function handleAddTransaction(e: Event) {
    isSubmitting = true;
    errorMsg = '';
    try {
      await submitTransaction(e, { editingId, showPanel, amount, date, category, formAccountId, destinationAccountId, paymentMethod, description, reference, accrualType, accrualNote, targetSeasonId });
    } catch (err: any) {
      errorMsg = err.message || 'Une erreur est survenue.';
      isSubmitting = false;
    }
  }

  let deleteDialogData = $state<{ id: number } | null>(null);

  let currentSeasonObj = $derived(seasons.find(s => s.code === selectedSeason || String(s.id) === String(selectedSeason)));
  let currentSeasonNumericId = $derived(currentSeasonObj?.id);

  function handleDelete(id: number) {
    deleteDialogData = { id };
  }

  async function confirmDelete() {
    if (!deleteDialogData) return;
    try {
      sessionStorage.setItem('ledger_scroll_y', window.scrollY.toString());
      await deleteTransaction(deleteDialogData.id);
      // @ts-ignore
      if (typeof toast !== 'undefined') toast.success('Écriture supprimée avec succès !');
    } catch (err: any) {
      // @ts-ignore
      if (typeof toast !== 'undefined') toast.error(err.message);
      deleteDialogData = null;
    }
  }

  function handleAccountTabChange(newAcc: string) {
    selectedAccount = newAcc;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('accountId', newAcc);
      params.set('page', '1');
      window.location.href = `/admin/accounting?${params.toString()}`;
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
    {searchQuery}
    onOpenPanel={openPanel}
    onApplySeasonChange={() => actionApplySeasonChange(selectedSeason)}
    onClearFilters={clearFilters}
  />

  <!-- Barre d'onglets des comptes du Grand Livre centrée -->

  <Tabs.Root value={selectedAccount || 'current'} onValueChange={handleAccountTabChange} class="w-full no-print">
    <Tabs.List class="grid w-full grid-cols-3 max-w-2xl mx-auto mb-6">
      <Tabs.Trigger value="current">Compte Courant</Tabs.Trigger>
      <Tabs.Trigger value="savings">Compte Livret</Tabs.Trigger>
      <Tabs.Trigger value="cash">Caisse Physique</Tabs.Trigger>
    </Tabs.List>
  </Tabs.Root>

  <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end w-full no-print mb-4">
    <div class="relative w-full sm:w-80">
      <Input
        type="text"
        placeholder="Rechercher par libellé ou référence..."
        value={searchQuery}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value;
            const params = new URLSearchParams(window.location.search);
            if (val) params.set('search', val);
            else params.delete('search');
            params.set('page', '1');
            window.location.href = `/admin/accounting?${params.toString()}`;
          }
        }}
        class="pl-9 pr-8 bg-background border-border h-9"
      />
      <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      {#if searchQuery}
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
          onclick={() => {
            const params = new URLSearchParams(window.location.search);
            params.delete('search');
            params.set('page', '1');
            window.location.href = `/admin/accounting?${params.toString()}`;
          }}
        >
          <X class="h-3 w-3" />
        </button>
      {/if}
    </div>

    <select
      class="px-3 py-1.5 border border-border bg-background rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9 w-full sm:w-auto"
      value={month}
      onchange={(e) => {
        const val = (e.target as HTMLSelectElement).value;
        const params = new URLSearchParams(window.location.search);
        if (val) params.set('month', val);
        else params.delete('month');
        params.set('page', '1');
        window.location.href = `/admin/accounting?${params.toString()}`;
      }}
    >
      <option value="">Tous les mois</option>
      <option value="01">Janvier</option>
      <option value="02">Février</option>
      <option value="03">Mars</option>
      <option value="04">Avril</option>
      <option value="05">Mai</option>
      <option value="06">Juin</option>
      <option value="07">Juillet</option>
      <option value="08">Août</option>
      <option value="09">Septembre</option>
      <option value="10">Octobre</option>
      <option value="11">Novembre</option>
      <option value="12">Décembre</option>
    </select>

    <select
      class="px-3 py-1.5 border border-border bg-background rounded-md text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-9 w-full sm:w-auto"
      value={limit}
      onchange={(e) => {
        const val = (e.target as HTMLSelectElement).value;
        const params = new URLSearchParams(window.location.search);
        if (val && val !== '20') params.set('limit', val);
        else params.delete('limit');
        params.set('page', '1');
        window.location.href = `/admin/accounting?${params.toString()}`;
      }}
    >
      <option value="20">20 par page</option>
      <option value="50">50 par page</option>
      <option value="100">100 par page</option>
    </select>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {#snippet child({ props })}
          <Button {...props} variant="outline" class="flex items-center gap-2 h-9 relative">
            <Filter class="w-4 h-4" /> Filtres
            {#if unreconciledChequesOnly}
              <span class="flex h-2 w-2 rounded-full bg-primary absolute -top-1 -right-1"></span>
            {/if}
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="w-72 p-4" align="end">
        <div class="space-y-4">
          <h4 class="font-medium text-sm leading-none">Filtres rapides</h4>
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={unreconciledChequesOnly}
                onCheckedChange={(v) => {
                  const params = new URLSearchParams(window.location.search);
                  if (v) params.set('unreconciledCheques', 'true');
                  else params.delete('unreconciledCheques');
                  params.set('page', '1');
                  window.location.href = `/admin/accounting?${params.toString()}`;
                }}
              />
              Chèques en circulation
            </label>
          </div>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <TransactionLedgerTable
    {transactions}
    {pagination}
    {activeCategories}
    {isClosed}
    selectedSeasonId={currentSeasonNumericId}
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
    bind:accrualType
    bind:accrualNote
    bind:targetSeasonId
    {seasons}
    {activeCategories}
    bind:isSubmitting
    bind:errorMsg
    onSubmit={handleAddTransaction}
  />

  <AlertDialog.Root open={!!deleteDialogData} onOpenChange={(o) => { if(!o) deleteDialogData = null; }}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Confirmation de suppression</AlertDialog.Title>
        <AlertDialog.Description>
          Êtes-vous sûr de vouloir supprimer cette écriture comptable ?
          <br/><br/>
          Cette action est irréversible.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>Annuler</AlertDialog.Cancel>
        <AlertDialog.Action onclick={confirmDelete} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
          Supprimer
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
</div>
