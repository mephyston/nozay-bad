import type { BankStatementLine, ReconciliationStateFields, SplitRow } from './reconciliation-types';
import { toast } from '@nba/ui';
import {
  apiLoadReconciliationStatements,
  apiLoadUnpaidInvoices,
  apiMatchLedgerEntry,
  apiCreateAndMatchSplit,
  apiCreateAndMatchSingle,
  apiDeleteLedgerEntry
} from './reconciliation-api';
import { scrollMemberOptionIntoView, scrollCategoryOptionIntoView } from './reconciliation-dropdowns';
import { createBulkActions } from './reconciliation-actions-bulk';
import { createPatchActions } from './reconciliation-patch';
import { buildSuggestionRequest } from './reconciliation-suggestion';
import { apiBulkReconcile } from './reconciliation-api';

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

  /**
   * Préremplit le formulaire à partir des factures choisies. **N'écrit rien.**
   *
   * L'écran offrait ici un troisième chemin de rapprochement, parallèle à la saisie : choisir une
   * facture créait directement une recette, avec `category: '1'` en dur — soit « Adhésions &
   * Inscriptions » pour une location de salle comme pour du sponsoring — et un mode de règlement
   * figé sur « virement ». Sur plusieurs factures, il n'en créait qu'**une**, libellée
   * « Rapprochement de N factures », ne retenant qu'un seul `invoice_id` : les autres passaient
   * `paid` sans aucune écriture pour les porter.
   *
   * Une facture n'est pas un chemin : c'est une source de préremplissage, au même titre que la
   * suggestion du modèle. Elle remplit la ventilation — une part par facture, et une par
   * catégorie quand la facture en mêle plusieurs — que la comptable relit, corrige et valide par
   * le geste habituel. Rien n'est plus codé en dur : ce qui manque se voit et se choisit.
   */
  /**
   * Valide la suggestion d'une ligne sans l'ouvrir : le geste courant de la file.
   *
   * Il ne passe **pas** par l'état du formulaire, et c'est délibéré : celui-ci se remplit par un
   * effet déclenché à la sélection de la ligne, donc après coup. Valider depuis une ligne repliée
   * enverrait alors le formulaire de la ligne précédente. La requête se déduit ici de la
   * suggestion elle-même, par le même constructeur que le lot.
   */
  async function validateSuggestion(line: BankStatementLine) {
    const request = buildSuggestionRequest(line, s.selectedSeason);
    if (!request) {
      toast.error("Cette opération demande une saisie : ouvrez-la pour la compléter.");
      return;
    }
    s.isSubmitting = true;
    try {
      const nextId = patch.pickNextId(line.id);
      const { lines, entries } = await apiBulkReconcile([request]);
      patch.applyOutcomes(lines, entries);
      toast.success('Opération rapprochée.');
      if (lines[0]?.status === 'reconciled') patch.selectById(nextId);
      s.isSubmitting = false;
      void refreshStatements();
    } catch (err: any) {
      toast.error(err.message);
      s.isSubmitting = false;
    }
  }

  function prefillFromInvoices(invoiceIds: number[]) {
    const chosen = s.unpaidInvoices.filter((inv) => invoiceIds.includes(inv.id));
    if (chosen.length === 0) return;

    const rows: SplitRow[] = [];
    for (const invoice of chosen) {
      const parts = invoice.categoryBreakdown?.length
        ? invoice.categoryBreakdown
        : [{ categoryId: null, amountCents: invoice.totalAmount }];

      for (const part of parts) {
        rows.push({
          // Vide quand la facture ne porte pas d'imputation : la comptable la choisit, en la voyant.
          category: part.categoryId != null ? String(part.categoryId) : '',
          amount: Math.abs(part.amountCents) / 100,
          invoiceId: invoice.id,
          label: `Facture ${invoice.invoiceNumber} — ${invoice.clientName}`
        });
      }
    }

    s.splits = rows;
    // Une part unique se saisit dans le formulaire simple ; au-delà, c'est une ventilation.
    s.isSplitMode = rows.length > 1;
    if (rows.length === 1) {
      s.category = rows[0].category;
      s.amountToLink = rows[0].amount;
    }
    s.activeRightTab = 'manual';
    toast.info(`${chosen.length} facture${chosen.length > 1 ? 's' : ''} reprise${chosen.length > 1 ? 's' : ''} : relisez l'écriture avant de valider.`);
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
        /*
         * Une part sans imputation est refusée ici, et nommée.
         *
         * Une facture antérieure à la colonne `category_id` n'en porte aucune : la reprise laisse
         * alors la case vide, à dessein. Sans ce contrôle, le serveur retomberait sur la
         * catégorie 1 — « Adhésions & Inscriptions » — et l'on aurait remplacé un défaut codé en
         * dur dans l'écran par le même défaut, caché un cran plus bas.
         */
        const missing = s.splits.findIndex((sp: SplitRow) => !sp.category);
        if (missing !== -1) throw new Error(`La catégorie de la part ${missing + 1} reste à choisir.`);
        outcome = await apiCreateAndMatchSplit(targetBt, memId, s.targetSeasonId, s.splits, s.accrualType, s.accrualNote);
      } else {
        if (!s.category) throw new Error("La catégorie comptable reste à choisir.");
        outcome = await apiCreateAndMatchSingle(targetBt, memId, s.targetSeasonId, s.category, s.amountToLink, s.accrualType, s.accrualNote);
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


  return {
    ...bulk,
    ...patch,
    toggleInvoiceSelection, addSplitRow, removeSplitRow, refreshStatements,
    loadUnpaidInvoices, prefillFromInvoices, validateSuggestion,
    selectMember, handleMemberKeyDown, selectCategory, handleCategoryKeyDown,
    handleMatch, handleCreateAndMatch, handleDeletePart
  };
}
