<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, X, Filter, ChevronDown } from '@lucide/svelte';
  import { Button, Dialog, Sheet, Tabs, Input, DropdownMenu, Checkbox, AlertDialog, DataTableToolbar, FormField, SearchableCombobox, softNavigate, submitForm, toast, toSeasonOptions } from '@nba/ui';
  import type { Transaction, Pagination, BalanceReport, Season, Category, AccountClass } from './ledger-types';
  import { submitTransaction, validateTransaction, deleteTransaction, changePage as actionChangePage, applySeasonChange as actionApplySeasonChange } from './ledger-actions';
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
      softNavigate(`/admin/accounting?${params.toString()}`);
    }
  });

  let filteredCategory = $state<string | null>(null);
  let filteredClassCode = $state<string | null>(null);

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    filteredCategory = params.get('category');
    filteredClassCode = params.get('classCode');

    // Handle PWA shortcuts
    const action = params.get('action');
    if (action === 'new-recette') {
      openPanel('recette');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl);
    } else if (action === 'new-depense') {
      openPanel('depense');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl);
    } else if (action === 'new-transfert') {
      openPanel('transfert');
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('action');
      window.history.replaceState({}, '', newUrl);
    }

    const onRecette = () => openPanel('recette');
    const onDepense = () => openPanel('depense');
    window.addEventListener('open-new-recette', onRecette);
    window.addEventListener('open-new-depense', onDepense);
    return () => {
      window.removeEventListener('open-new-recette', onRecette);
      window.removeEventListener('open-new-depense', onDepense);
    };
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
    softNavigate(`/admin/accounting?${params.toString()}`);
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
  /** Date de valeur au crédit : vide tant que le trésorier ne la distingue pas de celle du débit. */
  let destinationDate = $state('');
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
    /*
     * Les comptes, le moyen de paiement et la catégorie sont remis à zéro eux aussi.
     *
     * Ils ne l'étaient pas : après avoir modifié une écriture, ouvrir « Virement Interne »
     * héritait des comptes de la précédente — et du moyen de paiement, pourtant masqué à l'écran,
     * dont le `default_entry_status` partait tel quel en base. Un virement pouvait ainsi naître
     * `in_vault`, sans que rien ne le montre.
     */
    formAccountId = 'current';
    destinationAccountId = 'cash';
    destinationDate = '';
    paymentMethod = 'virement';
    category = '1';
    date = new Date().toISOString().split('T')[0];
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
    category = tx.categoryId ? String(tx.categoryId) : '1';
    formAccountId = reverseAccountMap[tx.accountId as any] || 'current';
    paymentMethod = tx.paymentMethod;
    description = tx.description;
    reference = tx.reference || '';
    accrualType = (tx as any).accrualType || 'normal';
    accrualNote = (tx as any).accrualNote || '';
    targetSeasonId = tx.seasonId;
    showPanel = tx.type;
  }

  async function handleAddTransaction(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMsg = '';

    const values = { editingId, showPanel, amount, date, category, formAccountId, destinationAccountId, destinationDate, paymentMethod, description, reference, accrualType, accrualNote, targetSeasonId };
    await submitForm({
      validate: () => validateTransaction(values),
      submit: () => submitTransaction(values),
      success: editingId ? 'Écriture mise à jour.' : 'Écriture enregistrée.',
      close: () => { showPanel = null; },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    isSubmitting = false;
  }

  let deleteDialogData = $state<{ id: number } | null>(null);

  let currentSeasonObj = $derived(seasons.find(s => s.code === selectedSeason || String(s.id) === String(selectedSeason)));
  let currentSeasonNumericId = $derived(currentSeasonObj?.id);

  function handleDelete(id: number) {
    deleteDialogData = { id };
  }

  async function confirmDelete() {
    if (!deleteDialogData) return;
    const { id } = deleteDialogData;
    sessionStorage.setItem('ledger_scroll_y', window.scrollY.toString());
    await submitForm({
      submit: () => deleteTransaction(id),
      success: 'Écriture supprimée.',
      close: () => { deleteDialogData = null; },
      onError: (message) => { deleteDialogData = null; toast.error(message); }
    });
  }

  function handleAccountTabChange(newAcc: string) {
    selectedAccount = newAcc;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('accountId', newAcc);
      params.set('page', '1');
      softNavigate(`/admin/accounting?${params.toString()}`);
    }
  }

  const seasonItems = $derived(
    seasons.length > 0
      ? toSeasonOptions(seasons)
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );
  const accountItems = [
    { label: 'Compte Courant', value: 'current' },
    { label: 'Compte Livret', value: 'savings' },
    { label: 'Caisse Physique', value: 'cash' }
  ];
  const monthItems = [
    { label: 'Tous les mois', value: '' },
    { label: 'Janvier', value: '01' }, { label: 'Février', value: '02' }, { label: 'Mars', value: '03' },
    { label: 'Avril', value: '04' }, { label: 'Mai', value: '05' }, { label: 'Juin', value: '06' },
    { label: 'Juillet', value: '07' }, { label: 'Août', value: '08' }, { label: 'Septembre', value: '09' },
    { label: 'Octobre', value: '10' }, { label: 'Novembre', value: '11' }, { label: 'Décembre', value: '12' }
  ];

  function applyMonthFilter(val: string) {
    const params = new URLSearchParams(window.location.search);
    if (val) params.set('month', val);
    else params.delete('month');
    params.set('page', '1');
    softNavigate(`/admin/accounting?${params.toString()}`);
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
          softNavigate(`/admin/accounting?${params.toString()}`);
        }}
        onSearchClear={() => {
          const params = new URLSearchParams(window.location.search);
          params.delete('search');
          params.set('page', '1');
          softNavigate(`/admin/accounting?${params.toString()}`);
        }}
      >
        {#snippet filters()}
            <FormField id="filter-season" label="Saison">
            <SearchableCombobox id="filter-season" items={seasonItems} bind:value={selectedSeason} onValueChange={() => actionApplySeasonChange(selectedSeason)} />
          </FormField>

            <FormField id="filter-account" label="Compte">
            <SearchableCombobox id="filter-account" items={accountItems} value={selectedAccount || 'current'} onValueChange={(v) => handleAccountTabChange(String(v))} />
          </FormField>

            <FormField id="filter-month" label="Mois">
            <SearchableCombobox id="filter-month" items={monthItems} value={month} onValueChange={(v) => applyMonthFilter(String(v))} />
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
                  softNavigate(`/admin/accounting?${params.toString()}`);
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
          <Button href={`/admin/accounting/reports?season=${selectedSeason}&export=ledger`} class="h-9 gap-2 w-full sm:w-auto" variant="secondary" target="_blank" download>
            Exporter (CSV)
          </Button>
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
    bind:destinationDate
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
