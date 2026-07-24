import type { BankStatementLine, Member } from './reconciliation-types';

export function setupReconciliationEffects(ctx: {
  activeTab: string;
  selectedTx: BankStatementLine | null;
  bankStatementLines: BankStatementLine[];
  selectedSeason: string;
  lastProcessedTxId: number | null;
  isMemberDropdownOpen: boolean;
  memberHighlightedIndex: number;
  filteredMembers: Member[];
  isCategoryDropdownOpen: boolean;
  categoryHighlightedIndex: number;
  filteredCategories: any[];
  remainingAmount: number;
  loadUnpaidInvoices: () => void;
  resetSelection: () => void;
  setMemberFromAi: (sug: any) => void;
}) {
  function safeEffect(fn: () => void) {
    try {
      $effect(fn);
    } catch (e) {}
  }

  safeEffect(() => {
    const _ = ctx.activeTab;
    ctx.resetSelection();
  });

  safeEffect(() => {
    if (ctx.selectedSeason) {
      ctx.loadUnpaidInvoices();
    }
  });

  safeEffect(() => {
    if (ctx.selectedTx && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('reconcile_active_bt_id', ctx.selectedTx.id.toString());
    }
  });

  safeEffect(() => {
    if (!ctx.isMemberDropdownOpen) {
      ctx.memberHighlightedIndex = -1;
    }
  });

  safeEffect(() => {
    const total = ctx.filteredMembers.length + 1;
    if (ctx.memberHighlightedIndex >= total) {
      ctx.memberHighlightedIndex = total - 1;
    }
  });

  safeEffect(() => {
    if (!ctx.isCategoryDropdownOpen) {
      ctx.categoryHighlightedIndex = -1;
    }
  });

  safeEffect(() => {
    const total = ctx.filteredCategories.length;
    if (ctx.categoryHighlightedIndex >= total) {
      ctx.categoryHighlightedIndex = total - 1;
    }
  });
}
