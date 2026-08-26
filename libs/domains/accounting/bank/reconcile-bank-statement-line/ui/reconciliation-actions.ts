import type { BankStatementLine, ReconciliationStateFields, SplitRow } from './reconciliation-types';
import { toast, uiConfirm } from '@nba/ui';
import {
  apiLoadReconciliationStatements,
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
import { createPatchActions } from './reconciliation-patch';

export function createReconciliationActions(s: ReconciliationStateFields) {
  const patch = createPatchActions(s);
  const bulk = createBulkActions(s, patch);

  /**
   * Le geste commun à toutes les écritures : appliquer ce que le serveur a répondu, le dire, et
   * passer à la suivante si la ligne est soldée.
   *
   * Chaque action se terminait auparavant par `flashAndReload` — un rendu serveur complet de la
   * page pour une seule ligne rapprochée. La ligne reste ici sélectionnée tant qu'il reste
   * quelque chose à lui rattacher : c'est le cas d'une ventilation saisie en plusieurs fois.
   */
  function settle(outcome: { line: BankStatementLine | null; entries: any[] }, message: string, currentBtId: number) {
    // Le voisin se repère avant le rapiéçage : après, la ligne traitée a quitté la file.
    const nextId = patch.pickNextId(currentBtId);
    patch.applyOutcome(outcome);
    toast.success(message);
    if (outcome.line?.status === 'reconciled') patch.selectById(nextId);
    s.isSubmitting = false;
    void refreshStatements();
  }

  /**
   * L'encart d'état de rapprochement, relu à part.
   *
   * C'est le seul morceau de l'écran que le client ne sait pas recalculer : l'écart se mesure
   * contre le solde annoncé par la banque. Sa relecture ne bloque pas le geste — elle échoue en
   * silence plutôt que d'annuler un rapprochement qui, lui, a bien eu lieu.
   */
  async function refreshStatements() {
    try {
      s.reconciliationStatements = await apiLoadReconciliationStatements(s.selectedSeason);
    } catch (err) {
      console.error("État de rapprochement non relu :", err);
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
      const outcome = await apiReconcileInvoice(bt, invoice);
      s.unpaidInvoices = s.unpaidInvoices.filter((inv) => inv.id !== invoiceId);
      settle(outcome, 'Rapprochement de facture effectué !', bt.id);
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
      const btId = s.selectedTx.id;
      const outcome = await apiMultiInvoiceReconcile(s.selectedTx, firstInvoice, ids);
      const paid = new Set(ids);
      s.unpaidInvoices = s.unpaidInvoices.filter((inv) => !paid.has(inv.id));
      s.selectedInvoiceIds = new Set();
      settle(outcome, 'Rapprochement des factures effectué !', btId);
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
      const outcome = await apiMatchLedgerEntry(btId, ledgerEntryId, s.selectedMemberId ? parseInt(s.selectedMemberId) : null);
      settle(outcome, 'Rapprochement effectué avec succès !', btId);
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
      let outcome;
      if (s.isSplitMode) {
        const splitSumCents = s.splits.reduce((acc: number, sp: SplitRow) => acc + Math.round((sp.amount || 0) * 100), 0);
        if (Math.abs(splitSumCents - s.remainingAmount) > 10) throw new Error("Le montant total ventilé doit être égal au reste à rapprocher.");
        outcome = await apiCreateAndMatchSplit(targetBt, memId, s.targetSeasonId, s.paymentMethod, s.splits, s.accrualType, s.accrualNote);
      } else {
        outcome = await apiCreateAndMatchSingle(targetBt, memId, s.targetSeasonId, s.category, s.amountToLink, s.paymentMethod, s.accrualType, s.accrualNote);
      }
      settle(outcome, 'Écriture créée et rapprochée avec succès !', targetBt.id);
    } catch (err: any) { 
      toast.error(err.message); 
      s.errorMsg = err.message || 'Erreur lors de la création.';
      s.isSubmitting = false; 
    }
  }

  async function handleDeletePart(txId: number) {
    s.isSubmitting = true;
    try {
      const { deletedEntryIds, resetBankStatementLineIds } = await apiDeleteLedgerEntry(txId);
      patch.applyDeletion(deletedEntryIds, resetBankStatementLineIds);
      toast.success('Écriture dissociée avec succès !');
      s.isSubmitting = false;
      void refreshStatements();
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleUnignore(btId: number) {
    s.isSubmitting = true;
    try {
      await apiUnignore(btId);
      patch.applyStatus([btId], 'pending');
      toast.success('Transaction rétablie !');
      s.isSubmitting = false;
      void refreshStatements();
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  async function handleIgnore(btId: number) {
    if (!(await uiConfirm('Voulez-vous ignorer cette transaction bancaire ?'))) return;
    s.isSubmitting = true;
    try {
      const nextId = patch.pickNextId(btId);
      await apiIgnore(btId);
      patch.applyStatus([btId], 'ignored');
      patch.selectById(nextId);
      toast.info('Transaction ignorée.');
      s.isSubmitting = false;
      void refreshStatements();
    } catch (err: any) { toast.error(err.message); s.isSubmitting = false; }
  }

  return {
    ...bulk,
    ...patch,
    toggleSelectAll, toggleInvoiceSelection, addSplitRow, removeSplitRow, refreshStatements,
    loadUnpaidInvoices, handleReconcile, handleMultiInvoiceReconcile,
    selectMember, handleMemberKeyDown, selectCategory, handleCategoryKeyDown,
    handleMatch, handleCreateAndMatch, handleDeletePart, handleUnignore, handleIgnore
  };
}
