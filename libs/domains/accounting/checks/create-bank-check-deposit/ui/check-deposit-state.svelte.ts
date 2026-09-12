import { Check, CheckDeposit, Member, BankStatementLine, SeasonOption, categoriesList } from './check-deposit-types';

export function createCheckDepositState(props: () => {
  seasonId: string;
  seasons: SeasonOption[];
  checks: Check[];
  checkDeposits: CheckDeposit[];
  members: Member[];
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
  let checkCategory = $state('1');
  let checkDate = $state(today());
  // Mois de remise prévu, en calendaire ('9' … '8') ; vide = aucune indication.
  let checkPlannedDepositMonth = $state('');
  let formError = $state('');

  // Search filter for checks & members in select
  let checkSearchQuery = $state('');
  let memberSearchQuery = $state('');
  let matchedMemberName = $state('');

  function resetCheckForm() {
    editingCheckId = null;
    checkNumber = '';
    checkAmount = '';
    checkEmitter = '';
    checkBank = '';
    checkMemberId = '';
    checkCategory = '1';
    checkDate = today();
    checkPlannedDepositMonth = '';
    formError = '';
    memberSearchQuery = '';
    matchedMemberName = '';
    categorySearchQuery = '';
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
    checkCategory = String(check.categoryId ?? 1);
    checkDate = check.date ?? String(check.createdAt).slice(0, 10);
    checkPlannedDepositMonth = check.plannedDepositMonth ? String(check.plannedDepositMonth) : '';
    showAddCheckModal = true;
  }

  // Combobox states
  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let categorySearchQuery = $state('');

  // Derived display values
  const memberDisplayVal = $derived.by(() => {
    if (!checkMemberId) return '';
    const m = p.members.find(item => item.id === parseInt(checkMemberId));
    return m ? `${m.lastName} ${m.firstName} (${m.licence})` : '';
  });

  const categoryDisplayVal = $derived.by(() => {
    const cat = categoriesList.find((c: any) => c.id === checkCategory);
    return cat ? cat.name : '';
  });

  const filteredCategories = $derived.by(() => {
    if (!categorySearchQuery.trim()) return categoriesList;
    const q = categorySearchQuery.toLowerCase();
    return categoriesList.filter((c: any) => c.name.toLowerCase().includes(q));
  });

  const filteredMembers = $derived.by(() => {
    if (!memberSearchQuery) return p.members.slice(0, 10);
    const q = memberSearchQuery.toLowerCase();
    return p.members.filter(m => 
      m.firstName.toLowerCase().includes(q) || 
      m.lastName.toLowerCase().includes(q) || 
      m.licence.includes(q) ||
      (m.parent1Name && m.parent1Name.toLowerCase().includes(q)) ||
      (m.parent2Name && m.parent2Name.toLowerCase().includes(q))
    ).slice(0, 15);
  });

  const memberOptions = $derived.by(() => {
    let list = [...filteredMembers];
    if (checkMemberId) {
      const selectedId = parseInt(checkMemberId);
      const isAlreadyInList = list.some(m => m.id === selectedId);
      if (!isAlreadyInList) {
        const found = p.members.find(m => m.id === selectedId);
        if (found) list = [found, ...list];
      }
    }
    return list;
  });

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
    get memberSearchQuery() { return memberSearchQuery; }, set memberSearchQuery(v) { memberSearchQuery = v; },
    get matchedMemberName() { return matchedMemberName; }, set matchedMemberName(v) { matchedMemberName = v; },
    get isMemberDropdownOpen() { return isMemberDropdownOpen; }, set isMemberDropdownOpen(v) { isMemberDropdownOpen = v; },
    get isCategoryDropdownOpen() { return isCategoryDropdownOpen; }, set isCategoryDropdownOpen(v) { isCategoryDropdownOpen = v; },
    get categorySearchQuery() { return categorySearchQuery; }, set categorySearchQuery(v) { categorySearchQuery = v; },
    get memberDisplayVal() { return memberDisplayVal; },
    get categoryDisplayVal() { return categoryDisplayVal; },
    get filteredCategories() { return filteredCategories; },
    get memberOptions() { return memberOptions; },
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
