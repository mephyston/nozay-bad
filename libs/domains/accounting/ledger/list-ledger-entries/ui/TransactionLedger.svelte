<script lang="ts">
  import { onMount } from 'svelte';
  import { softNavigate, submitForm, toSeasonOptions, uiAlert } from '@nba/ui';
  import type { Transaction, Pagination, BalanceReport, Season, Category, AccountClass } from './ledger-types';
  import { submitTransaction, validateTransaction, deleteTransaction, editValuesFor, changePage as actionChangePage, applySeasonChange as actionApplySeasonChange } from './ledger-actions';
  import TransactionLedgerBalances from './TransactionLedgerBalances.svelte';
  import TransactionLedgerHeader from './TransactionLedgerHeader.svelte';
  import TransactionLedgerTable from './TransactionLedgerTable.svelte';
  import TransactionFormSheet from './TransactionFormSheet.svelte';
  import LedgerToolbar from './LedgerToolbar.svelte';
  import { urlDuJournal } from './ledger-filters';
  import {
    criteresDeRapport,
    ecouterPointsDEntree,
    restaurerPosition,
    retenirPosition
  } from './ledger-navigation';
  import { toAccountOptions, type AccountLike } from '../../../shared/account-labels';
  import type { MemberLike } from './member-options';

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
    mainAccountId = '',
    activeAccounts = [],
    paymentMethods = [],
    members = [],
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
    /** Le compte bancaire principal du club : le compte affiché à défaut, et celui des saisies par défaut. */
    mainAccountId?: string;
    /** Les comptes actifs, avec leur nature : ce que les formulaires proposent. */
    activeAccounts?: AccountLike[];
    /** Les moyens de paiement actifs du club. */
    paymentMethods?: { code: string; label: string; kind: string }[];
    /** L'annuaire des exercices ouverts, pour rattacher une recette à l'adhérent qui paie. */
    members?: MemberLike[];
    searchQuery?: string;
    month?: string;
    limit?: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let selectedAccount = $state(accountId || mainAccountId);

  $effect(() => {
    if (selectedAccount !== (accountId || mainAccountId)) {
      softNavigate(urlDuJournal(window.location.search, { accountId: selectedAccount }));
    }
  });

  let filteredCategory = $state<string | null>(null);
  let filteredClassCode = $state<string | null>(null);
  let filteredAccrual = $state<string | null>(null);
  let filteredType = $state<string | null>(null);

  /*
   * Le solde progressif et les soldes de fin de mois n'ont de sens que sur une liste
   * continue : toutes les écritures du compte, dans l'ordre. Une recherche par libellé
   * ou un filtre par catégorie, classe, sens, rattachement ou chèques non pointés en
   * retire une partie — le solde d'une ligne isolée surprend, et un « solde fin
   * septembre » posé sur la dernière écriture trouvée ment. Le mois, lui, garde une
   * suite continue : les soldes restent.
   */
  const continuous = $derived(
    !searchQuery && !filteredCategory && !filteredClassCode && !filteredAccrual && !filteredType && !unreconciledChequesOnly
  );

  onMount(() => {
    const criteres = criteresDeRapport(window.location.search);
    filteredCategory = criteres.category;
    filteredClassCode = criteres.classCode;
    filteredAccrual = criteres.accrual;
    filteredType = criteres.type;
    return ecouterPointsDEntree(openPanel);
  });

  // La position se restaure après chaque rendu de liste : on revient du rapprochement
  // sur une écriture précise, ou d'une suppression qui a rechargé la page.
  $effect(() => {
    restaurerPosition(transactions.length > 0);
  });

  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let open = $state(false);
  $effect(() => { open = showPanel !== null; });
  $effect(() => { if (!open) showPanel = null; });

  let amount = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let category = $state('1');
  let formAccountId = $state<string>(mainAccountId);
  let destinationAccountId = $state<string>('');
  /** Date de valeur au crédit : vide tant que le trésorier ne la distingue pas de celle du débit. */
  let destinationDate = $state('');
  let paymentMethod = $state(paymentMethods[0]?.code ?? '');
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
  let memberId = $state('');

  function openPanel(type: 'recette' | 'depense' | 'transfert') {
    showPanel = type;
    amount = '';
    description = '';
    accrualType = 'normal';
    accrualNote = '';
    targetSeasonId = selectedSeason;
    editingId = null;
    editingTransferId = null;
    /*
     * Les comptes, le moyen de paiement et la catégorie sont remis à zéro eux aussi.
     *
     * Ils ne l'étaient pas : après avoir modifié une écriture, ouvrir « Virement Interne »
     * héritait des comptes de la précédente — et du moyen de paiement, pourtant masqué à l'écran,
     * dont le `default_entry_status` partait tel quel en base. Un virement pouvait ainsi naître
     * `in_vault`, sans que rien ne le montre.
     */
    formAccountId = mainAccountId;
    // Le premier autre compte actif : le formulaire ne propose jamais le compte de départ en face.
    destinationAccountId = activeAccounts.find((a) => a.code !== mainAccountId)?.code ?? '';
    destinationDate = '';
    paymentMethod = paymentMethods.find((m) => m.kind === 'transfer')?.code ?? paymentMethods[0]?.code ?? '';
    category = '1';
    date = new Date().toISOString().split('T')[0];
    memberId = '';
  }

  let editingTransferId = $state<number | null>(null);

  // Une jambe de virement rouvre le virement entier : ses deux comptes et ses deux dates.
  function startEdit(tx: Transaction, e: MouseEvent) {
    e.stopPropagation();
    const values = editValuesFor(tx, accounts, { accountId: mainAccountId, seasonId: selectedSeason });
    editingId = values.editingId;
    editingTransferId = values.editingTransferId ?? null;
    amount = values.amount;
    date = values.date;
    category = values.category;
    formAccountId = values.formAccountId;
    destinationAccountId = values.destinationAccountId;
    destinationDate = values.destinationDate;
    paymentMethod = values.paymentMethod;
    description = values.description;
    reference = values.reference;
    accrualType = values.accrualType;
    accrualNote = values.accrualNote;
    targetSeasonId = values.targetSeasonId;
    memberId = values.memberId ?? '';
    showPanel = values.showPanel;
  }

  async function handleAddTransaction(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMsg = '';

    const values = { editingId, editingTransferId, showPanel, amount, date, category, formAccountId, destinationAccountId, destinationDate, paymentMethod, description, reference, accrualType, accrualNote, targetSeasonId, memberId };
    await submitForm({
      validate: () => validateTransaction(values),
      submit: () => submitTransaction(values),
      close: () => { showPanel = null; },
      // Le sheet couvre la page : le refus s'affiche dans le formulaire lui-même.
      onError: (message) => { errorMsg = message; }
    });

    isSubmitting = false;
  }

  let currentSeasonObj = $derived(seasons.find(s => s.code === selectedSeason || String(s.id) === String(selectedSeason)));
  let currentSeasonNumericId = $derived(currentSeasonObj?.id);

  /**
   * La question est déjà posée par l'action de ligne, la même pour le balayage, le menu
   * de la liste et celui de la table — c'est ce qui remplace la boîte de dialogue que
   * cet écran portait à la main, et qui n'existait que pour lui.
   */
  async function handleDelete(id: number) {
    retenirPosition();
    await submitForm({
      submit: () => deleteTransaction(id),
      onError: (message) => uiAlert(message)
    });
  }

  const seasonItems = $derived(
    seasons.length > 0
      ? toSeasonOptions(seasons)
      : [{ label: 'Saison 2025-2026', value: '25-26' }]
  );
  /*
   * Les comptes viennent du bilan de trésorerie, une ligne par compte lu de la base : les
   * sélecteurs, les cartes et le sens des virements en dérivent. Plus de liste de trois codes.
   */
  const accounts = $derived<AccountLike[]>(
    balances.map((b) => ({ id: b.id, code: b.accountId, label: b.label ?? b.accountId }))
  );
  const accountItems = $derived(toAccountOptions(accounts));
</script>

<div class="space-y-6">
  <TransactionLedgerBalances {balances} />

  <TransactionLedgerHeader {isClosed} />

  <TransactionLedgerTable
    {transactions}
    {pagination}
    {accounts}
    {activeCategories}
    {isClosed}
    showBalance={continuous}
    selectedSeasonId={currentSeasonNumericId}
    onStartEdit={startEdit}
    onDelete={handleDelete}
    onChangePage={(p) => actionChangePage(p, pagination.totalPages)}
  >
    {#snippet toolbar()}
      <LedgerToolbar
        searchQuery={searchQuery}
        bind:selectedSeason
        bind:selectedAccount
        {month}
        {unreconciledChequesOnly}
        {filteredCategory}
        {filteredClassCode}
        {filteredAccrual}
        {categories}
        {accountClasses}
        {seasonItems}
        {accountItems}
        {isClosed}
        resultCount={pagination?.total ?? transactions.length}
        exportHref={`/admin/api/accounting/download?doc=export&type=ledger&season=${selectedSeason}`}
        onOpenPanel={openPanel}
        onApplySeasonChange={() => actionApplySeasonChange(selectedSeason)}
      />
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
    bind:memberId
    {seasons}
    accounts={activeAccounts.length > 0 ? activeAccounts : accounts}
    {paymentMethods}
    {members}
    {activeCategories}
    bind:isSubmitting
    bind:errorMsg
    onSubmit={handleAddTransaction}
  />

</div>
