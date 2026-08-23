import type { BankStatementLine, GLTransaction, Season, Invoice, Member, ReconciliationStateProps } from './reconciliation-types';

export * from './reconciliation-types';
export * from './reconciliation-api';
export * from './reconciliation-dropdowns';
export * from './reconciliation-actions';
export * from './reconciliation-proxy';
export * from './reconciliation-refs';

import { createReconciliationActions } from './reconciliation-actions';
import { createReconciliationProxy } from './reconciliation-proxy';
import { createRefHandlers } from './reconciliation-refs';

export function createReconciliationState(initialPropsOrGetter: ReconciliationStateProps | (() => ReconciliationStateProps)) {
  const getProps = typeof initialPropsOrGetter === 'function' ? initialPropsOrGetter : () => initialPropsOrGetter;
  let bankStatementLines = $state(getProps().bankStatementLines);
  let glTransactions = $state(getProps().glTransactions);
  let seasonId = $state(getProps().seasonId);
  let seasons = $state(getProps().seasons);
  let members = $state(getProps().members);
  let dbCategories = $state(getProps().dbCategories || []);

  let selectedSeason = $state(getProps().seasonId);
  let selectedTx = $state<BankStatementLine | null>(null);
  let isSubmitting = $state(false);
  let isAnalyzing = $state(false);
  let isAnalyzingSingle = $state(false);
  let errorMsg = $state('');
  let showImportModal = $state(false);
  let selectedAccount = $state('auto');

  let activeTab = $state<'pending' | 'reconciled' | 'ignored'>('pending');
  let unpaidInvoices = $state<Invoice[]>([]);
  let activeRightTab = $state<'manual' | 'ledger' | 'invoice'>('manual');

  let category = $state('1');
  let paymentMethod = $state('virement');
  let selectedMemberId = $state<string>('');
  let accrualType = $state('normal');
  let accrualNote = $state('');
  let amountToLink = $state<number>(0);
  let lastProcessedTxId = $state<number | null>(null);

  let selectedInvoiceIds = $state<Set<number>>(new Set());
  let isSplitMode = $state(false);
  let splits = $state<{ category: string; amount: number }[]>([]);

  let isMemberDropdownOpen = $state(false);
  let isCategoryDropdownOpen = $state(false);
  let memberSearchQuery = $state('');
  let categorySearchQuery = $state('');
  let targetSeasonId = $state(getProps().seasonId);

  let selectedTxIds = $state<Record<number, boolean>>({});
  let searchQuery = $state('');
  let monthFilter = $state('');
  let memberHighlightedIndex = $state(-1);
  let categoryHighlightedIndex = $state(-1);

  const isClosed = $derived(seasons.find(s => s.code === selectedSeason || String(s.id) === selectedSeason)?.closed || false);
  const categories = $derived(dbCategories.filter((c: any) => c.active !== false).map((c: any) => ({ id: String(c.id), code: c.code, name: c.adminLabel })));
  const sortedMembers = $derived([...members].sort((a, b) => a.lastName.localeCompare(b.lastName)));

  function getSuggestions(bt: BankStatementLine) {
    const btAmt = (bt as any).amountCents ?? bt.amount ?? 0;
    return glTransactions.filter(gt => {
      if (gt.bankStatementLineId) return false;
      const gtAmt = (gt as any).amountCents ?? gt.amount ?? 0;
      if (Math.abs(gtAmt) !== Math.abs(btAmt)) return false;
      const isBankDebit = btAmt < 0;
      if (isBankDebit && gt.type === 'recette') return false;
      if (!isBankDebit && gt.type === 'depense') return false;
      return Math.abs(new Date(bt.date).getTime() - new Date(gt.date).getTime()) / 86400000 <= 7;
    });
  }

  const suggestions = $derived(selectedTx ? getSuggestions(selectedTx) : []);
  const linkedGlTxs = $derived(selectedTx ? glTransactions.filter(gt => gt.bankStatementLineId === selectedTx!.id) : []);
  const totalLinked = $derived(linkedGlTxs.reduce((sum, gt) => sum + Math.abs((gt as any).amountCents ?? gt.amount ?? 0), 0));
  const remainingAmount = $derived(selectedTx ? Math.abs((selectedTx as any).amountCents ?? selectedTx.amount ?? 0) - totalLinked : 0);

  const pendingCount = $derived(bankStatementLines.filter(t => t.status === 'pending').length);
  const reconciledCount = $derived(bankStatementLines.filter(t => t.status === 'reconciled').length);
  const ignoredCount = $derived(bankStatementLines.filter(t => t.status === 'ignored').length);
  const selectedCount = $derived(Object.keys(selectedTxIds).map(Number).filter(id => selectedTxIds[id]).length);
  const selectedSum = $derived(unpaidInvoices.filter(i => selectedInvoiceIds.has(i.id)).reduce((acc, i) => acc + i.totalAmount, 0));

  const displayedTransactions = $derived(
    bankStatementLines.filter(t => {
      if (t.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        if (!(t.name || '').toLowerCase().includes(query) && !(t.memo || '').toLowerCase().includes(query)) return false;
      }
      if (monthFilter) {
        if (!t.date.includes(`-${monthFilter}-`)) return false;
      }
      return true;
    })
  );

  const memberDisplayVal = $derived.by(() => {
    if (!selectedMemberId) return '';
    const m = members.find(x => x.id.toString() === selectedMemberId);
    return m ? `${m.lastName} ${m.firstName}` : '';
  });

  const categoryDisplayVal = $derived.by(() => categories.find(c => c.id === category)?.name || '');
  const filteredCategories = $derived(categorySearchQuery.trim() === '' ? categories : categories.filter(c => c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())));

  const filteredMembers = $derived.by(() => {
    const q = (memberSearchQuery || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return sortedMembers;
    return sortedMembers.filter(m => {
      const lastFirst = `${m.lastName || ''} ${m.firstName || ''} ${m.licence || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const firstLast = `${m.firstName || ''} ${m.lastName || ''} ${m.licence || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return lastFirst.includes(q) || firstLast.includes(q);
    });
  });
  const matchingInvoices = $derived(selectedTx && selectedTx.amount > 0 ? unpaidInvoices.filter(inv => inv.totalAmount === selectedTx?.amount) : []);
  const otherUnpaidInvoices = $derived(selectedTx && selectedTx.amount > 0 ? unpaidInvoices.filter(inv => inv.totalAmount !== selectedTx?.amount) : unpaidInvoices);

  function safeEffect(fn: () => void) { try { $effect(fn); } catch (e) {} }

  safeEffect(() => { const _ = activeTab; selectedTxIds = {}; searchQuery = ''; monthFilter = ''; });
  safeEffect(() => {
    if (selectedTx) {
      amountToLink = parseFloat((remainingAmount / 100).toFixed(2));
      memberSearchQuery = ''; categorySearchQuery = ''; targetSeasonId = selectedSeason; selectedInvoiceIds = new Set(); isSplitMode = false; splits = [];
    }
  });
  safeEffect(() => { if (selectedSeason) actions.loadUnpaidInvoices(); });
  safeEffect(() => {
    if (!selectedTx && bankStatementLines.length > 0 && typeof sessionStorage !== 'undefined') {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (!isMobile) {
        const savedIdStr = sessionStorage.getItem('reconcile_active_bt_id');
        if (savedIdStr) {
          const found = bankStatementLines.find(t => t.id === parseInt(savedIdStr) && t.status === activeTab);
          if (found) selectedTx = found;
        }
      }
    }
  });
  safeEffect(() => { if (selectedTx && typeof sessionStorage !== 'undefined') sessionStorage.setItem('reconcile_active_bt_id', selectedTx.id.toString()); });
  safeEffect(() => {
    if (selectedTx && selectedTx.id !== lastProcessedTxId) {
      lastProcessedTxId = selectedTx.id;
      if (selectedTx.aiSuggestions) {
        try {
          const sug = JSON.parse(selectedTx.aiSuggestions);
          selectedMemberId = sug.memberId ? sug.memberId.toString() : '';
          if (sug.category) category = sug.category.toString();
          // Rattachement d'exercice déduit du libellé (cotisation encaissée d'avance) :
          // il se préremplit comme le reste, et reste modifiable.
          accrualType = sug.accrualType || 'normal';
          accrualNote = sug.accrualNote || '';
        } catch (e) { selectedMemberId = ''; accrualType = 'normal'; accrualNote = ''; }
      } else { selectedMemberId = ''; accrualType = 'normal'; accrualNote = ''; }
    } else if (!selectedTx) { lastProcessedTxId = null; selectedMemberId = ''; accrualType = 'normal'; accrualNote = ''; }
  });
  safeEffect(() => { if (!isMemberDropdownOpen) memberHighlightedIndex = -1; });
  safeEffect(() => { if (!isCategoryDropdownOpen) categoryHighlightedIndex = -1; });

  const { getRef, setRef } = createRefHandlers(
    {
      bankStatementLines: () => bankStatementLines, glTransactions: () => glTransactions, seasonId: () => seasonId,
      seasons: () => seasons, members: () => members, dbCategories: () => dbCategories, selectedSeason: () => selectedSeason,
      selectedTx: () => selectedTx, isSubmitting: () => isSubmitting, isAnalyzing: () => isAnalyzing, isAnalyzingSingle: () => isAnalyzingSingle,
      errorMsg: () => errorMsg, showImportModal: () => showImportModal, selectedAccount: () => selectedAccount, activeTab: () => activeTab,
      unpaidInvoices: () => unpaidInvoices, activeRightTab: () => activeRightTab, category: () => category, paymentMethod: () => paymentMethod,
      selectedMemberId: () => selectedMemberId, accrualType: () => accrualType, accrualNote: () => accrualNote, amountToLink: () => amountToLink, lastProcessedTxId: () => lastProcessedTxId,
      selectedInvoiceIds: () => selectedInvoiceIds, isSplitMode: () => isSplitMode, splits: () => splits,
      isMemberDropdownOpen: () => isMemberDropdownOpen, isCategoryDropdownOpen: () => isCategoryDropdownOpen,
      memberSearchQuery: () => memberSearchQuery, categorySearchQuery: () => categorySearchQuery, targetSeasonId: () => targetSeasonId,
      selectedTxIds: () => selectedTxIds, searchQuery: () => searchQuery, monthFilter: () => monthFilter, memberHighlightedIndex: () => memberHighlightedIndex,
      categoryHighlightedIndex: () => categoryHighlightedIndex, isClosed: () => isClosed, categories: () => categories,
      sortedMembers: () => sortedMembers, suggestions: () => suggestions, linkedGlTxs: () => linkedGlTxs, totalLinked: () => totalLinked,
      remainingAmount: () => remainingAmount, pendingCount: () => pendingCount, reconciledCount: () => reconciledCount,
      ignoredCount: () => ignoredCount, selectedCount: () => selectedCount, selectedSum: () => selectedSum,
      displayedTransactions: () => displayedTransactions, memberDisplayVal: () => memberDisplayVal, categoryDisplayVal: () => categoryDisplayVal,
      filteredMembers: () => filteredMembers, filteredCategories: () => filteredCategories, matchingInvoices: () => matchingInvoices,
      otherUnpaidInvoices: () => otherUnpaidInvoices, getSuggestions: () => getSuggestions
    },
    {
      bankStatementLines: v => bankStatementLines = v, glTransactions: v => glTransactions = v, seasonId: v => seasonId = v,
      seasons: v => seasons = v, members: v => members = v, dbCategories: v => dbCategories = v, selectedSeason: v => selectedSeason = v,
      selectedTx: v => selectedTx = v, isSubmitting: v => isSubmitting = v, isAnalyzing: v => isAnalyzing = v, isAnalyzingSingle: v => isAnalyzingSingle = v,
      errorMsg: v => errorMsg = v, showImportModal: v => showImportModal = v, selectedAccount: v => selectedAccount = v, activeTab: v => activeTab = v,
      unpaidInvoices: v => unpaidInvoices = v, activeRightTab: v => activeRightTab = v, category: v => category = v, paymentMethod: v => paymentMethod = v,
      selectedMemberId: v => selectedMemberId = v, accrualType: v => accrualType = v, accrualNote: v => accrualNote = v, amountToLink: v => amountToLink = v, lastProcessedTxId: v => lastProcessedTxId = v,
      selectedInvoiceIds: v => selectedInvoiceIds = v, isSplitMode: v => isSplitMode = v, splits: v => splits = v,
      isMemberDropdownOpen: v => isMemberDropdownOpen = v, isCategoryDropdownOpen: v => isCategoryDropdownOpen = v,
      memberSearchQuery: v => memberSearchQuery = v, categorySearchQuery: v => categorySearchQuery = v, targetSeasonId: v => targetSeasonId = v,
      selectedTxIds: v => selectedTxIds = v, searchQuery: v => searchQuery = v, monthFilter: v => monthFilter = v, memberHighlightedIndex: v => memberHighlightedIndex = v,
      categoryHighlightedIndex: v => categoryHighlightedIndex = v
    }
  );

  const stateProxy = createReconciliationProxy({ getSuggestions }, getRef, setRef);
  const actions = createReconciliationActions(stateProxy);

  return createReconciliationProxy(actions, getRef, setRef);
}

export type ReconciliationState = ReturnType<typeof createReconciliationState>;
