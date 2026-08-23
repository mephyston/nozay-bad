import type { BankStatementLine, ReconciliationStateFields, SplitRow } from './reconciliation-types';
import { toast, uiConfirm, flashAndReload } from '@nba/ui';
import {
  apiLoadUnpaidInvoices,
  apiReconcileInvoice,
  apiMultiInvoiceReconcile,
  apiMatchLedgerEntry,
  apiCreateAndMatchSplit,
  apiCreateAndMatchSingle,
  apiDeleteLedgerEntry,
  apiUnignore,
  apiIgnore
} from './reconciliation-api';
import { scrollMemberOptionIntoView, scrollCategoryOptionIntoView } from './reconciliation-dropdowns';
import { createBulkActions } from './reconciliation-actions-bulk';

export function createReconciliationActions(s: ReconciliationStateFields) {
  const bulk = createBulkActions(s);

  function prepareNextFocus(currentBtId: number, isFullyReconciled: boolean) {
    if (typeof sessionStorage === 'undefined') return;
    if (!isFullyReconciled) {
      sessionStorage.setItem('reconcile_active_bt_id', currentBtId.toString());
    } else {
      const index = s.displayedTransactions.findIndex((t) => t.id === currentBtId);
      if (index !== -1) {
        if (index + 1 < s.displayedTransactions.length) sessionStorage.setItem('reconcile_active_bt_id', s.displayedTransactions[index + 1].id.toString());
        else if (index - 1 >= 0) sessionStorage.setItem('reconcile_active_bt_id', s.displayedTransactions[index - 1].id.toString());
        else sessionStorage.removeItem('reconcile_active_bt_id');
      } else sessionStorage.removeItem('reconcile_active_bt_id');
    }
  }

  function toggleSelectAll(displayedTxs: BankStatementLine[]) {
    const allSelected = displayedTxs.length > 0 && displayedTxs.every(t => s.selectedTxIds[t.id]);
    for (const t of displayedTxs) s.selectedTxIds[t.id] = !allSelected;
  }

  function toggleInvoiceSelection(id: number) {
    if (s.selectedInvoiceIds.has(id)) s.selectedInvoiceIds.delete(id);
    else s.selectedInvoiceIds.add(id);
    s.selectedInvoiceIds = new Set(s.selectedInvoiceIds);
  }

  function addSplitRow() { s.splits = [...s.splits, { category: '1', amount: 0 }]; }
  function removeSplitRow(index: number) { if (s.splits.length > 2) s.splits = s.splits.filter((_, i) => i !== index); }

  async function loadUnpaidInvoices() {
    try { s.unpaidInvoices = await apiLoadUnpaidInvoices(s.selectedSeason); } catch (err) { console.error('Erreur factures:', err); }
  }

  async function handleReconcile(action: 'create', bt: BankStatementLine, invoiceId: number) {
    s.isSubmitting = true;
    try {
      const invoice = s.unpaidInvoices.find((inv) => inv.id === invoiceId);
      if (!invoice) throw new Error('Facture introuvable.');
      prepareNextFocus(bt.id, (s.remainingAmount - invoice.totalAmount) <= 10);
      await apiReconcileInvoice(bt, invoice);
      flashAndReload('Rapprochement de facture effectué !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleMultiInvoiceReconcile() {
    if (!s.selectedTx) return;
    s.isSubmitting = true;
    try {
      const ids = Array.from(s.selectedInvoiceIds) as number[];
      if (ids.length === 0) throw new Error('Aucune facture sélectionnée.');
      const firstInvoice = s.unpaidInvoices.find((inv) => inv.id === ids[0]);
      if (!firstInvoice) throw new Error('Facture introuvable.');
      prepareNextFocus(s.selectedTx.id, Math.abs(s.selectedSum - s.selectedTx.amount) <= 10);
      await apiMultiInvoiceReconcile(s.selectedTx, firstInvoice, ids);
      flashAndReload('Rapprochement des factures effectué !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  function selectMember(idStr: string, name: string) { s.selectedMemberId = idStr; s.memberSearchQuery = name; s.isMemberDropdownOpen = false; s.memberHighlightedIndex = -1; }

  function handleMemberKeyDown(e: KeyboardEvent) {
    if (!s.isMemberDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { s.isMemberDropdownOpen = true; s.memberHighlightedIndex = 0; e.preventDefault(); }
      return;
    }
    const total = s.filteredMembers.length + 1;
    if (e.key === 'ArrowDown') { s.memberHighlightedIndex = (s.memberHighlightedIndex + 1) % total; e.preventDefault(); scrollMemberOptionIntoView(s.memberHighlightedIndex); }
    else if (e.key === 'ArrowUp') { s.memberHighlightedIndex = (s.memberHighlightedIndex - 1 + total) % total; e.preventDefault(); scrollMemberOptionIntoView(s.memberHighlightedIndex); }
    else if (e.key === 'Enter') {
      if (s.memberHighlightedIndex === 0) { selectMember('', ''); e.preventDefault(); }
      else if (s.memberHighlightedIndex > 0 && s.memberHighlightedIndex < total) { const m = s.filteredMembers[s.memberHighlightedIndex - 1]; selectMember(m.id.toString(), `${m.lastName} ${m.firstName}`); e.preventDefault(); }
    } else if (e.key === 'Escape') { s.isMemberDropdownOpen = false; e.preventDefault(); }
  }

  function selectCategory(id: string, name: string) { s.category = id; s.categorySearchQuery = name; s.isCategoryDropdownOpen = false; s.categoryHighlightedIndex = -1; }

  function handleCategoryKeyDown(e: KeyboardEvent) {
    if (!s.isCategoryDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { s.isCategoryDropdownOpen = true; s.categoryHighlightedIndex = 0; e.preventDefault(); }
      return;
    }
    const total = s.filteredCategories.length;
    if (e.key === 'ArrowDown') { s.categoryHighlightedIndex = (s.categoryHighlightedIndex + 1) % total; e.preventDefault(); scrollCategoryOptionIntoView(s.categoryHighlightedIndex); }
    else if (e.key === 'ArrowUp') { s.categoryHighlightedIndex = (s.categoryHighlightedIndex - 1 + total) % total; e.preventDefault(); scrollCategoryOptionIntoView(s.categoryHighlightedIndex); }
    else if (e.key === 'Enter') {
      if (s.categoryHighlightedIndex >= 0 && s.categoryHighlightedIndex < total) { const cat = s.filteredCategories[s.categoryHighlightedIndex]; selectCategory(cat.id, cat.name); e.preventDefault(); }
    } else if (e.key === 'Escape') { s.isCategoryDropdownOpen = false; e.preventDefault(); }
  }

  async function handleMatch(btId: number, ledgerEntryId: number) {
    s.isSubmitting = true;
    try {
      const matchedTx = s.glTransactions.find((t) => t.id === ledgerEntryId);
      prepareNextFocus(btId, (s.remainingAmount - (matchedTx ? Math.abs(matchedTx.amount) : 0)) <= 10);
      await apiMatchLedgerEntry(btId, ledgerEntryId, s.selectedMemberId ? parseInt(s.selectedMemberId) : null);
      flashAndReload('Rapprochement effectué avec succès !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  /**
   * Crée l'écriture et la rapproche de la ligne bancaire sélectionnée.
   *
   * `bt` n'est là que pour les appels qui désignent une autre ligne que la sélection
   * courante. Le formulaire unitaire, lui, n'en passe aucun — il lui envoyait
   * auparavant l'identifiant de l'adhérent, qui écrasait silencieusement la ligne et
   * produisait une requête vers `/bank-transactions/undefined/reconcile`.
   *
   * Le garde-fou refuse donc tout ce qui n'est pas une ligne bancaire, plutôt que de se
   * fier à la seule présence d'une valeur : une divergence de contrat entre deux
   * composants ne doit pas se rattraper au fond d'une URL.
   */
  async function handleCreateAndMatch(bt?: BankStatementLine) {
    s.isSubmitting = true;
    try {
      const targetBt = bt ?? s.selectedTx;
      if (!targetBt || typeof targetBt !== 'object' || typeof (targetBt as any).id !== 'number') {
        throw new Error('Aucune transaction bancaire sélectionnée.');
      }
      const memId = s.selectedMemberId ? parseInt(s.selectedMemberId) : null;
      if (s.isSplitMode) {
        const splitSumCents = s.splits.reduce((acc: number, sp: SplitRow) => acc + Math.round((sp.amount || 0) * 100), 0);
        if (Math.abs(splitSumCents - s.remainingAmount) > 10) throw new Error("Le montant total ventilé doit être égal au reste à rapprocher.");
        prepareNextFocus(targetBt.id, (s.remainingAmount - splitSumCents) <= 10);
        await apiCreateAndMatchSplit(targetBt, memId, s.targetSeasonId, s.paymentMethod, s.splits, s.accrualType, s.accrualNote);
      } else {
        const linkedAmount = Math.round(s.amountToLink * 100);
        prepareNextFocus(targetBt.id, (s.remainingAmount - linkedAmount) <= 10);
        await apiCreateAndMatchSingle(targetBt, memId, s.targetSeasonId, s.category, s.amountToLink, s.paymentMethod, s.accrualType, s.accrualNote);
      }
      flashAndReload('Écriture créée et rapprochée avec succès !');
    } catch (err: any) { 
      toast.error(err.message); 
      s.errorMsg = err.message || 'Erreur lors de la création.';
      s.isSubmitting = false; 
    }
  }

  async function handleMatchWithAI(btId: number, memberId: number | null, cat: string) {
    s.isSubmitting = true;
    try {
      prepareNextFocus(btId, true);
      const tx = s.bankStatementLines.find((t) => t.id === btId) || s.selectedTx;
      if (!tx) throw new Error('Transaction introuvable.');

      const btAmtCents = Math.abs(tx.amountCents ?? tx.amount ?? 0);
      const amountToLink = s.remainingAmount > 0 ? (s.remainingAmount / 100) : (btAmtCents / 100);

      let resolvedCat = String(cat || '1');
      const numCat = parseInt(resolvedCat);
      if (isNaN(numCat) || numCat <= 0) {
        const found = s.categories.find((c) => c.id === resolvedCat || c.code === resolvedCat || c.name.toLowerCase().includes(resolvedCat.toLowerCase()));
        resolvedCat = found ? found.id : '1';
      }

      await apiCreateAndMatchSingle(tx, memberId, s.selectedSeason, resolvedCat, amountToLink, 'virement', 'normal', '');
      flashAndReload('Rapprochement IA appliqué !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleDeletePart(txId: number) {
    s.isSubmitting = true;
    try {
      if (s.selectedTx) prepareNextFocus(s.selectedTx.id, false);
      await apiDeleteLedgerEntry(txId);
      flashAndReload('Écriture dissociée avec succès !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleUnignore(btId: number) {
    s.isSubmitting = true;
    try {
      prepareNextFocus(btId, false);
      await apiUnignore(btId);
      flashAndReload('Transaction rétablie !');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleIgnore(btId: number) {
    if (!(await uiConfirm('Voulez-vous ignorer cette transaction bancaire ?'))) return;
    s.isSubmitting = true;
    try {
      prepareNextFocus(btId, true);
      await apiIgnore(btId);
      flashAndReload('Transaction ignorée.', 'info');
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  return {
    ...bulk,
    toggleSelectAll, toggleInvoiceSelection, addSplitRow, removeSplitRow, prepareNextFocus,
    loadUnpaidInvoices, handleReconcile, handleMultiInvoiceReconcile,
    selectMember, handleMemberKeyDown, selectCategory, handleCategoryKeyDown,
    handleMatch, handleCreateAndMatch, handleMatchWithAI, handleDeletePart, handleUnignore, handleIgnore
  };
}
