<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, X, Filter, ChevronDown } from '@lucide/svelte';
  import { Button, Dialog, Sheet, Tabs, Input, DropdownMenu, Checkbox, AlertDialog, DataTableToolbar, FormField } from '@nba/ui';
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



  <TransactionLedgerTable
    {transactions}
    {pagination}
    {activeCategories}
    {isClosed}
    selectedSeasonId={currentSeasonNumericId}
    onStartEdit={startEdit}
    onDelete={handleDelete}
    onChangePage={(p) => actionChangePage(p, pagination.totalPages)}
  >
    {#snippet toolbar()}
      <DataTableToolbar
        bind:searchValue={searchQuery}
        searchPlaceholder="Rechercher par libellé..."
        hasFilters={true}
        filtersActive={unreconciledChequesOnly || !!month || (!!selectedAccount && selectedAccount !== 'current')}
        onSearchSubmit={(val) => {
          const params = new URLSearchParams(window.location.search);
          if (val) params.set('search', val);
          else params.delete('search');
          params.set('page', '1');
          window.location.href = `/admin/accounting?${params.toString()}`;
        }}
        onSearchClear={() => {
          const params = new URLSearchParams(window.location.search);
          params.delete('search');
          params.set('page', '1');
          window.location.href = `/admin/accounting?${params.toString()}`;
        }}
      >
        {#snippet filters()}
            <FormField id="filter-season" label="Saison">
            <select
              id="filter-season"
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              bind:value={selectedSeason}
              onchange={() => actionApplySeasonChange(selectedSeason)}
            >
              {#each seasons as season}
                <option value={season.code || season.id}>{season.name}</option>
              {/each}
              {#if seasons.length === 0}
                <option value="25-26">Saison 2025-2026</option>
              {/if}
            </select>
          </FormField>

            <FormField id="filter-account" label="Compte">
            <select
              id="filter-account"
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              value={selectedAccount || 'current'}
              onchange={(e) => handleAccountTabChange((e.target as HTMLSelectElement).value)}
            >
              <option value="current">Compte Courant</option>
              <option value="savings">Compte Livret</option>
              <option value="cash">Caisse Physique</option>
            </select>
          </FormField>

            <FormField id="filter-month" label="Mois">
            <select
              id="filter-month"
              class="w-full h-9 px-3 py-1.5 border border-border bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
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
          </FormField>

          <div class="space-y-1.5">
            <span class="text-xs font-semibold text-muted-foreground">Options</span>
            <label class="flex items-center gap-2 text-sm cursor-pointer mt-1">
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
        {/snippet}

        {#snippet actions()}
          {#if !isClosed}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                {#snippet child({ props })}
                  <Button {...props} class="h-9 gap-2 w-full sm:w-auto">
                    Nouvelle écriture <ChevronDown class="w-4 h-4" />
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onclick={() => openPanel('recette')} class="text-success font-medium cursor-pointer">Saisir Recette</DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => openPanel('depense')} class="text-destructive font-medium cursor-pointer">Saisir Dépense</DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => openPanel('transfert')} class="font-medium cursor-pointer">Virement Interne</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {/if}
        {/snippet}
      </DataTableToolbar>
    {/snippet}
  </TransactionLedgerTable>

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
