import { Check, CheckDeposit, Member, BankStatementLine, SeasonOption, type PlanCategory, receiptCategories } from './check-deposit-types';

export function createCheckDepositState(props: () => {
  seasonId: string;
  seasons: SeasonOption[];
  checks: Check[];
  checkDeposits: CheckDeposit[];
  members: Member[];
  categories?: PlanCategory[];
  pendingBankTransactions: BankStatementLine[];
  initialTab?: 'checks' | 'deposits';
  hideTabs?: boolean;
}) {
  const p = $derived(props());

  let activeTab = $state<'checks' | 'deposits'>(p.initialTab || 'checks');
  const isClosed = $derived(p.seasons.find(s => s.id === p.seasonId)?.closed || false);

  // Check form state (création et modification partagent le même formulaire)
  const today = () => new Date().toISOString().split('T')[0];
  let showAddCheckModal = $state(false);
  let editingCheckId = $state<number | null>(null);
  let isAnalyzing = $state(false);
  let isSubmittingCheck = $state(false);
  let checkNumber = $state('');
  let checkAmount = $state('');
  let checkEmitter = $state('');
  let checkBank = $state('');
  let checkMemberId = $state<string>('');
  let checkCategory = $state('');
  let checkDate = $state(today());
  // Mois de remise prévu, en calendaire ('9' … '8') ; vide = aucune indication.
  let checkPlannedDepositMonth = $state('');
  let formError = $state('');

  // Search filter for checks
  let checkSearchQuery = $state('');
  let matchedMemberName = $state('');

  function resetCheckForm() {
    editingCheckId = null;
    checkNumber = '';
    checkAmount = '';
    checkEmitter = '';
    checkBank = '';
    checkMemberId = '';
    checkCategory = '';
    checkDate = today();
    checkPlannedDepositMonth = '';
    formError = '';
    matchedMemberName = '';
  }

  function openCreateCheck() {
    resetCheckForm();
    showAddCheckModal = true;
  }

  /** Prérenseigne le formulaire depuis la ligne : la date et la catégorie viennent de la recette liée. */
  function openEditCheck(check: Check) {
    resetCheckForm();
    editingCheckId = check.id;
    checkNumber = check.number;
    checkAmount = (check.amount / 100).toString();
    checkEmitter = check.emitter;
    checkBank = check.bank ?? '';
    checkMemberId = check.memberId ? String(check.memberId) : '';
    checkCategory = check.categoryId != null ? String(check.categoryId) : '';
    checkDate = check.date ?? String(check.createdAt).slice(0, 10);
    checkPlannedDepositMonth = check.plannedDepositMonth ? String(check.plannedDepositMonth) : '';
    showAddCheckModal = true;
  }

  /*
   * Les choix de l'adhérent et de la catégorie, prêts pour `SearchableCombobox` : au doigt, il
   * ouvre un écran dédié avec sa recherche. Le formulaire tenait deux autocomplétions maison,
   * dont la liste flottante se dépliait sous un champ que le clavier recouvrait aussitôt.
   *
   * La recherche porte sur le libellé et la seconde ligne : nom, licence, parents.
   */
  const memberItems = $derived(
    [...p.members]
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr', { sensitivity: 'base' }))
      .map((m) => ({
        value: String(m.id),
        label: `${m.lastName} ${m.firstName} (${m.licence})`,
        hint: [m.parent1Name, m.parent2Name].filter(Boolean).join(' · ') || undefined
      }))
  );

  // La catégorie du chèque en cours de modification reste proposée, même désactivée depuis.
  const categoryItems = $derived(
    receiptCategories(p.categories ?? [], checkCategory ? Number(checkCategory) : null).map((c) => ({
      value: c.id,
      label: c.name
    }))
  );

  // Selected checks for deposit
  let selectedCheckIds = $state<Record<number, boolean>>({});
  let showCreateDepositModal = $state(false);
  let depositReference = $state('');
  let depositDate = $state(new Date().toISOString().split('T')[0]);
  let isSubmittingDeposit = $state(false);

  // Clearing / Reconciliation modal
  let showClearModal = $state(false);
  let selectedDepositToClear = $state<CheckDeposit | null>(null);
  let selectedBankTransactionId = $state<string>('');
  let isSubmittingClear = $state(false);

  // Un chèque reçu mais déjà inscrit sur une remise à déposer n'est plus disponible.
  const isDepositable = (c: Check) => c.status === 'received' && !c.checkDepositId;
  const selectedChecksList = $derived.by(() => p.checks.filter(c => isDepositable(c) && selectedCheckIds[c.id]));
  const totalSelectedAmount = $derived.by(() => selectedChecksList.reduce((sum, c) => sum + c.amount, 0));

  const filteredChecks = $derived.by(() => {
    if (!checkSearchQuery) return p.checks.filter(c => c.status === 'received');
    const q = checkSearchQuery.toLowerCase();
    return p.checks.filter(c => 
      c.status === 'received' && (
        c.number.includes(q) ||
        c.emitter.toLowerCase().includes(q) ||
        (c.bank && c.bank.toLowerCase().includes(q)) ||
        (c.memberName && c.memberName.toLowerCase().includes(q))
      )
    );
  });

  return {
    get activeTab() { return activeTab; }, set activeTab(v) { activeTab = v; },
    get isClosed() { return isClosed; },
    get showAddCheckModal() { return showAddCheckModal; }, set showAddCheckModal(v) { showAddCheckModal = v; },
    get editingCheckId() { return editingCheckId; }, set editingCheckId(v) { editingCheckId = v; },
    resetCheckForm,
    openCreateCheck,
    openEditCheck,
    get isAnalyzing() { return isAnalyzing; }, set isAnalyzing(v) { isAnalyzing = v; },
    get isSubmittingCheck() { return isSubmittingCheck; }, set isSubmittingCheck(v) { isSubmittingCheck = v; },
    get checkNumber() { return checkNumber; }, set checkNumber(v) { checkNumber = v; },
    get checkAmount() { return checkAmount; }, set checkAmount(v) { checkAmount = v; },
    get checkEmitter() { return checkEmitter; }, set checkEmitter(v) { checkEmitter = v; },
    get checkBank() { return checkBank; }, set checkBank(v) { checkBank = v; },
    get checkMemberId() { return checkMemberId; }, set checkMemberId(v) { checkMemberId = v; },
    get checkCategory() { return checkCategory; }, set checkCategory(v) { checkCategory = v; },
    get checkDate() { return checkDate; }, set checkDate(v) { checkDate = v; },
    get checkPlannedDepositMonth() { return checkPlannedDepositMonth; }, set checkPlannedDepositMonth(v) { checkPlannedDepositMonth = v; },
    get formError() { return formError; }, set formError(v) { formError = v; },
    get checkSearchQuery() { return checkSearchQuery; }, set checkSearchQuery(v) { checkSearchQuery = v; },
    get matchedMemberName() { return matchedMemberName; }, set matchedMemberName(v) { matchedMemberName = v; },
    get memberItems() { return memberItems; },
    get categoryItems() { return categoryItems; },
    get selectedCheckIds() { return selectedCheckIds; }, set selectedCheckIds(v) { selectedCheckIds = v; },
    get showCreateDepositModal() { return showCreateDepositModal; }, set showCreateDepositModal(v) { showCreateDepositModal = v; },
    get depositReference() { return depositReference; }, set depositReference(v) { depositReference = v; },
    get depositDate() { return depositDate; }, set depositDate(v) { depositDate = v; },
    get isSubmittingDeposit() { return isSubmittingDeposit; }, set isSubmittingDeposit(v) { isSubmittingDeposit = v; },
    get showClearModal() { return showClearModal; }, set showClearModal(v) { showClearModal = v; },
    get selectedDepositToClear() { return selectedDepositToClear; }, set selectedDepositToClear(v) { selectedDepositToClear = v; },
    get selectedBankTransactionId() { return selectedBankTransactionId; }, set selectedBankTransactionId(v) { selectedBankTransactionId = v; },
    get isSubmittingClear() { return isSubmittingClear; }, set isSubmittingClear(v) { isSubmittingClear = v; },
    get selectedChecksList() { return selectedChecksList; },
    get depositableChecks() { return filteredChecks.filter(isDepositable); },
    get totalSelectedAmount() { return totalSelectedAmount; },
    get filteredChecks() { return filteredChecks; }
  };
}

export type CheckDepositState = ReturnType<typeof createCheckDepositState>;
