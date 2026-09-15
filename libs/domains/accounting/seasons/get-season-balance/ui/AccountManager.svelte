<script lang="ts">
  import type { AccountEntry, CategoryOption, ScreenAccount, Season } from './account-types';
  import { accountActions, prefillAction, showsMemberAdvances, type AccountAction } from './account-actions';
  import { pendingMemberAdvances, type PendingAdvance } from './member-advances';
  import AccountStatsCards from './AccountStatsCards.svelte';
  import AccountHistoryTable from './AccountHistoryTable.svelte';
  import MemberAdvancesWidget from './MemberAdvancesWidget.svelte';
  import TransactionFormSheet from '../../../ledger/list-ledger-entries/ui/TransactionFormSheet.svelte';
  import { submitTransaction, validateTransaction, deleteTransaction, type TransactionFormValues } from '../../../ledger/list-ledger-entries/ui/ledger-actions';
  import type { AccountLike } from '../../../shared/account-labels';
  import { toast, submitForm, uiConfirm, flashAndReload, seasonForDate } from '@nba/ui';

  /**
   * Un compte sans relevé — la caisse, le porte-monnaie Badnet, le compte d'attente des
   * adhérents — vu de près : ses soldes, son historique, et les gestes qu'on y fait, pré-câblés.
   *
   * Le formulaire est celui du grand livre, ouvert avec les bons comptes déjà choisis : ce
   * composant ne sait pas écrire une écriture, il sait seulement quoi proposer.
   */
  let {
    account,
    accounts = [],
    categories = [],
    initialBalance = 0,
    transactions = [],
    memberAdvanceEntries = [],
    paymentMethods = [],
    seasonId,
    seasons = [],
    canWrite = true,
    canDelete = true
  }: {
    account: ScreenAccount;
    accounts?: AccountLike[];
    categories?: CategoryOption[];
    initialBalance: number;
    transactions: AccountEntry[];
    /** Les écritures du compte d'attente, pour lister les avances à rendre. */
    memberAdvanceEntries?: AccountEntry[];
    /** Les moyens de paiement actifs du club, avec leur nature. */
    paymentMethods?: { code: string; label: string; kind: string }[];
    seasonId: string;
    seasons?: Season[];
    canWrite?: boolean;
    canDelete?: boolean;
  } = $props();

  const currentSeason = $derived(seasons.find((s) => s.code === seasonId || String(s.id) === String(seasonId)));
  const isClosed = $derived(currentSeason?.closed || false);

  /*
   * Les écritures reçues sont déjà celles du compte — la page les demande par compte. Il n'y a
   * donc plus de compte à reconnaître, seulement un sens à lire : une jambe `destination` fait
   * entrer l'argent, une jambe `source` le fait sortir.
   */
  const enters = (tx: AccountEntry) =>
    tx.type === 'recette' || (tx.type === 'transfert' && tx.transferLeg === 'destination');

  /*
   * Le solde se calcule comme au grand livre : l'à-nouveau, plus les mouvements **datés dans
   * l'exercice**. Une écriture rattachée à cet exercice mais datée avant son ouverture (une
   * inscription d'interclubs réglée en août pour la saison suivante) est déjà comptée dans
   * l'à-nouveau, qui se calcule par date : l'additionner encore la comptait deux fois, et
   * l'écran du compte ne retombait pas sur le solde du grand livre.
   */
  const seasonStart = $derived(currentSeason?.startDate ?? '');
  const inSeason = (tx: AccountEntry) => !seasonStart || tx.date >= seasonStart;

  const totalIn = $derived(transactions.reduce((sum, tx) => (enters(tx) && inSeason(tx) ? sum + tx.amount : sum), 0));
  const totalOut = $derived(transactions.reduce((sum, tx) => (!enters(tx) && inSeason(tx) ? sum + tx.amount : sum), 0));
  const currentBalance = $derived(initialBalance + totalIn - totalOut);

  let searchTerm = $state('');
  const filteredTransactions = $derived(
    transactions.filter((tx) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        tx.description.toLowerCase().includes(term) ||
        (tx.category ?? '').toLowerCase().includes(term) ||
        tx.amount.toString().includes(term) ||
        tx.date.includes(term)
      );
    })
  );

  const actions = $derived(accountActions(account.kind ?? 'bank'));
  const today = new Date().toISOString().split('T')[0];
  const advances = $derived(
    showsMemberAdvances(account.kind ?? 'bank') ? pendingMemberAdvances(memberAdvanceEntries, accounts, today) : null
  );
  const refundAction = $derived(actions.find((a) => a.refundsPendingAdvance));
  /** Le porte-monnaie du club, nommé par son libellé : l'écran ne connaît plus « Badnet ». */
  const walletLabel = $derived(
    account.kind === 'wallet' ? account.label : (accounts.find((a) => a.kind === 'wallet')?.label ?? 'le porte-monnaie')
  );

  const activeCategories = $derived(
    categories
      .filter((c) => c.active !== false)
      .map((c) => ({ id: String(c.id), code: c.code ?? '', name: c.adminLabel }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  );

  // L'état du formulaire du grand livre, tel qu'il le lie.
  let open = $state(false);
  let showPanel = $state<'recette' | 'depense' | 'transfert' | null>(null);
  let amount = $state('');
  let date = $state(today);
  let category = $state('');
  let formAccountId = $state('');
  let destinationAccountId = $state('');
  let destinationDate = $state('');
  let paymentMethod = $state('');
  let description = $state('');
  let reference = $state('');
  let accrualType = $state('normal');
  let accrualNote = $state('');
  let targetSeasonId = $state('');
  let isSubmitting = $state(false);
  let errorMsg = $state('');

  $effect(() => { open = showPanel !== null; });
  $effect(() => { if (!open) showPanel = null; });

  function applyValues(values: TransactionFormValues) {
    amount = values.amount;
    date = values.date;
    category = values.category || (activeCategories[0]?.id ?? '');
    formAccountId = values.formAccountId;
    destinationAccountId = values.destinationAccountId;
    destinationDate = values.destinationDate;
    paymentMethod = values.paymentMethod;
    description = values.description;
    reference = values.reference;
    accrualType = values.accrualType;
    accrualNote = values.accrualNote;
    targetSeasonId = values.targetSeasonId;
    errorMsg = '';
    showPanel = values.showPanel;
  }

  /*
   * L'exercice d'affectation est celui de la date du geste, pas celui que l'écran affiche :
   * une avance reçue en août se rend en septembre, depuis l'écran de l'exercice écoulé où
   * elle apparaît, et le virement appartient au nouvel exercice. Sans bornes connues, on
   * retombe sur l'exercice consulté.
   */
  const seasonForForm = (date: string) => String(seasonForDate(seasons, date)?.id ?? currentSeason?.id ?? seasonId);

  function startAction(action: AccountAction, pending?: PendingAdvance) {
    applyValues(prefillAction(action, { today, targetSeasonId: seasonForForm(today), self: account, accounts, paymentMethods, pending: pending ?? null }));
  }

  function refund(advance: PendingAdvance) {
    if (refundAction) startAction(refundAction, advance);
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    isSubmitting = true;
    errorMsg = '';
    const values: TransactionFormValues = {
      editingId: null, showPanel, amount, date, category, formAccountId, destinationAccountId,
      destinationDate, paymentMethod, description, reference, accrualType, accrualNote, targetSeasonId
    };
    await submitForm({
      validate: () => validateTransaction(values),
      submit: () => submitTransaction(values),
      success: 'Mouvement enregistré.',
      close: () => { showPanel = null; },
      onError: (message) => { errorMsg = message; }
    });
    isSubmitting = false;
  }

  async function handleDelete(id: number) {
    const tx = transactions.find((t) => t.id === id);
    const question = tx?.type === 'transfert'
      ? 'Supprimer ce virement ? Ses deux jambes disparaissent, sur les deux comptes.'
      : 'Supprimer ce mouvement ?';
    if (!(await uiConfirm(question))) return;
    try {
      await deleteTransaction(id);
      flashAndReload('Mouvement supprimé.');
    } catch (err: any) {
      toast.error(err.message);
    }
  }
</script>

<div class="space-y-6">
  <AccountStatsCards label={account.label} thirdParty={account.thirdParty} {initialBalance} {totalIn} {totalOut} {currentBalance} />

  {#if advances}
    <MemberAdvancesWidget
      pending={advances.pending}
      totalCents={advances.totalCents}
      walletLabel={walletLabel}
      onRefund={refundAction && canWrite && !isClosed ? refund : undefined}
    />
  {/if}

  <div class="grid gap-6 grid-cols-1">
    <AccountHistoryTable
      {filteredTransactions}
      bind:searchTerm
      {isClosed}
      {canWrite}
      {canDelete}
      {seasonId}
      {seasons}
      {accounts}
      catalogue={actions}
      onDelete={handleDelete}
      onAction={(action) => startAction(action)}
    />
  </div>

  <TransactionFormSheet
    bind:open
    bind:showPanel
    editingId={null}
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
    seasons={seasons as any}
    {accounts}
    {paymentMethods}
    {activeCategories}
    bind:isSubmitting
    bind:errorMsg
    onSubmit={handleSubmit}
  />
</div>
