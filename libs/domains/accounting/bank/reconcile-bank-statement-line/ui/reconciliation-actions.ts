import type { BankStatementLine, ReconciliationStateFields, SplitRow } from './reconciliation-types';
import { toast, seasonForDate } from '@nba/ui';
import {
  apiLoadReconciliationStatements,
  apiLoadUnpaidInvoices,
  apiMatchLedgerEntry,
  apiCreateAndMatchSplit,
  apiCreateAndMatchSingle,
  apiCreateInternalTransfer,
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

  /**
   * Un virement reçu d'une adhérente, depuis sa ligne de relevé, en deux temps.
   *
   * Le relais ne sait faire qu'un appel par écriture : on crée le virement (compte d'attente →
   * courant), puis on pointe sa jambe bancaire contre la ligne. Si le pointage échoue, le
   * virement est supprimé — ses deux jambes — pour ne pas laisser un virement orphelin que
   * l'écran ne saurait plus rattacher.
   *
   * Ce n'est ni une recette ni une dépense : l'argent appartient à l'adhérente, le club le lui
   * rendra sur Badnet. Le saisir en recette fausserait le compte de résultat.
   */
  async function handleMemberTransfer(line: BankStatementLine, description: string) {
    s.isSubmitting = true;
    try {
      const cents = (line as any).amountCents ?? line.amount ?? 0;
      if (cents <= 0) throw new Error("Un virement reçu d'une adhérente est une ligne au crédit.");
      if (!description.trim()) throw new Error("Le libellé doit nommer l'adhérente.");

      /*
       * L'exercice est celui de la DATE de la ligne, pas celui que l'écran affiche : la file
       * n'a pas de borne d'exercice, et depuis le 1er septembre une ligne d'août rapprochée
       * depuis le nouvel exercice tombait hors de ses bornes — refus sans motif de rattachement.
       */
      const season = seasonForDate(s.seasons, line.date);
      const thirdParty = s.thirdPartyAccount;
      if (!thirdParty) throw new Error("Aucun compte d'attente des adhérents n'est actif : réglez les comptes du club.");
      const { legs } = await apiCreateInternalTransfer({
        seasonId: season ? String(season.code ?? season.id) : s.selectedSeason,
        sourceAccountId: thirdParty.code,
        destinationAccountId: String(line.accountId),
        amountCents: cents,
        sourceDate: line.date,
        destinationDate: line.date,
        description: description.trim(),
        reference: line.fitid ? `BQ-${line.fitid}` : null
      });
      const destination = legs.find((l) => l.transferLeg === 'destination') ?? legs[0];

      try {
        const outcome = await apiMatchLedgerEntry(line.id, destination.id, null);
        settle(outcome, 'Virement reçu enregistré et pointé. Pensez à le rendre sur Badnet.', line.id);
      } catch (err) {
        await apiDeleteLedgerEntry(destination.id).catch(() => undefined);
        throw err;
      }
    } catch (err: any) {
      toast.error(err.message);
      s.isSubmitting = false;
    }
  }

  /**
   * Un virement entre deux comptes du club, depuis l'une de ses lignes de relevé.
   *
   * L'écran renvoyait au grand livre : « cet écran ne produit qu'une écriture, un virement en a
   * deux ». C'était vrai avant le virement d'adhérente, qui fait déjà les deux appels — créer
   * le virement, pointer sa jambe. Il ne manquait que le choix du compte en face.
   *
   * Le sens se lit sur la ligne : au débit, elle est la jambe `source` ; au crédit, la jambe
   * `destination`. Quand le relevé de l'autre compte porte la ligne qui répond à celle-ci, et
   * qu'elle est seule à le faire, l'autre jambe prend sa date de valeur et se pointe dans la
   * foulée. Sinon elle reste à pointer depuis l'autre compte, par « Associer », comme avant.
   *
   * Si le premier pointage échoue, le virement est supprimé — ses deux jambes. Si c'est le
   * second, le virement reste : il est juste, et sa jambe se pointera plus tard.
   */
  async function handleInternalTransfer(line: BankStatementLine, counterpartAccountId: string | number, description: string) {
    s.isSubmitting = true;
    try {
      const cents = (line as any).amountCents ?? line.amount ?? 0;
      if (cents === 0) throw new Error('Une ligne à zéro ne peut pas porter un virement.');
      if (!description.trim()) throw new Error('Le virement doit porter un libellé.');
      const counterpart = s.accountOf(counterpartAccountId);
      if (!counterpart) throw new Error("Le compte d'en face est inconnu.");
      const own = s.accountOf(line.accountId);
      if (own && own.id === counterpart.id) throw new Error("Le compte d'en face doit être différent de celui de la ligne.");

      const isDebit = cents < 0;
      const other = s.findTransferCounterpartLine(line, counterpart.id);
      /*
       * Chaque jambe porte la date de valeur de sa ligne : l'écart entre les deux, c'est
       * l'argent en transit. L'API refuse un crédit antérieur au débit — une banque peut
       * pourtant dater ainsi — et dans ce cas les deux jambes prennent la date de la ligne.
       */
      let sourceDate = isDebit ? line.date : (other?.date ?? line.date);
      let destinationDate = isDebit ? (other?.date ?? line.date) : line.date;
      if (destinationDate < sourceDate) sourceDate = destinationDate = line.date;
      // L'exercice est celui de la date de la ligne, pas celui que l'écran affiche (cf. handleMemberTransfer).
      // Un virement dont les deux dates se répartissent sur deux exercices n'a d'exercice nulle part.
      const season = seasonForDate(s.seasons, line.date);
      if (season && seasonForDate(s.seasons, sourceDate) !== season) sourceDate = line.date;
      if (season && seasonForDate(s.seasons, destinationDate) !== season) destinationDate = line.date;
      const { legs } = await apiCreateInternalTransfer({
        seasonId: season ? String(season.code ?? season.id) : s.selectedSeason,
        sourceAccountId: isDebit ? String(line.accountId) : counterpart.code,
        destinationAccountId: isDebit ? counterpart.code : String(line.accountId),
        amountCents: Math.abs(cents),
        sourceDate,
        destinationDate,
        description: description.trim(),
        reference: line.fitid ? `BQ-${line.fitid}` : null
      });
      const ownLeg = legs.find((l) => l.transferLeg === (isDebit ? 'source' : 'destination'));
      const otherLeg = legs.find((l) => l.transferLeg === (isDebit ? 'destination' : 'source'));
      if (!ownLeg) throw new Error("Le virement a été créé sans la jambe de ce compte : impossible de le pointer.");

      let outcome;
      try {
        outcome = await apiMatchLedgerEntry(line.id, ownLeg.id, null);
      } catch (err) {
        await apiDeleteLedgerEntry(ownLeg.id).catch(() => undefined);
        throw err;
      }

      if (other && otherLeg) {
        try {
          patch.applyOutcome(await apiMatchLedgerEntry(other.id, otherLeg.id, null));
          settle(outcome, `Virement enregistré, les deux lignes sont pointées (${counterpart.label} comprise).`, line.id);
        } catch (err: any) {
          settle(outcome, 'Virement enregistré et pointé ici.', line.id);
          toast.error(`La ligne de ${counterpart.label} n'a pas pu être pointée : ${err.message}`);
        }
      } else {
        settle(outcome, `Virement enregistré et pointé. Reste à associer sa jambe depuis ${counterpart.label}.`, line.id);
      }
    } catch (err: any) {
      toast.error(err.message);
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
    handleMatch, handleCreateAndMatch, handleMemberTransfer, handleInternalTransfer, handleDeletePart
  };
}
