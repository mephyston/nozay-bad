import type { BankStatementLine, GLTransaction, Season, Invoice, Member, SplitRow, CategoryOption, ReconciliationStateProps } from './reconciliation-types';

export * from './reconciliation-types';
export * from './reconciliation-api';
export * from './reconciliation-dropdowns';
export * from './reconciliation-actions';
export * from './reconciliation-suggestion';

import { createReconciliationActions } from './reconciliation-actions';

/**
 * L'état de l'écran de rapprochement.
 *
 * Il vivait dans une fermeture, derrière un `Proxy` : quarante-quatre lecteurs et trente-deux
 * écrivains recopiés à la main dans deux tables, que le `Proxy` interrogeait à chaque accès. Le
 * contrat n'était vérifié par personne — un champ ajouté à l'état sans sa ligne dans la table
 * revenait `undefined` à l'écran, sans erreur ni échec de compilation. Le dépôt en porte déjà la
 * trace : deux commentaires documentent des pannes muettes nées de ce mécanisme, et une troisième
 * y dormait encore (les props absentes de `MatchTransaction`).
 *
 * Une classe à champs `$state` / `$derived` — l'idiome de Svelte 5 — rend le même service : les
 * champs sont réactifs en lecture comme en écriture, et le compilateur vérifie enfin qu'ils
 * existent.
 */
export class ReconciliationStore {
  bankStatementLines = $state<BankStatementLine[]>([]);
  glTransactions = $state<GLTransaction[]>([]);
  seasonId = $state('');
  seasons = $state<Season[]>([]);
  members = $state<Member[]>([]);
  dbCategories = $state<any[]>([]);
  reconciliationStatements = $state<any[]>([]);

  selectedSeason = $state('');
  selectedTx = $state<BankStatementLine | null>(null);
  isSubmitting = $state(false);
  isAnalyzing = $state(false);
  isAnalyzingSingle = $state(false);
  errorMsg = $state('');
  showImportModal = $state(false);
  selectedAccount = $state('auto');

  /*
    L'écran de travail ne montre que ce qui reste à décider.

    Les trois onglets « À rapprocher / Rapprochées / Ignorées » mettaient sur le même plan une file
    à vider et deux archives. `view` sépare les deux ; `activeTab` ne sert plus qu'à choisir
    l'archive consultée.
  */
  view = $state<'queue' | 'history'>('queue');
  activeTab = $state<'reconciled' | 'ignored'>('reconciled');
  unpaidInvoices = $state<Invoice[]>([]);
  activeRightTab = $state<'manual' | 'ledger'>('manual');

  category = $state('1');
  paymentMethod = $state('virement');
  selectedMemberId = $state('');
  accrualType = $state('normal');
  accrualNote = $state('');
  amountToLink = $state(0);
  lastProcessedTxId = $state<number | null>(null);

  selectedInvoiceIds = $state<Set<number>>(new Set());
  isSplitMode = $state(false);
  splits = $state<SplitRow[]>([]);

  isMemberDropdownOpen = $state(false);
  isCategoryDropdownOpen = $state(false);
  memberSearchQuery = $state('');
  categorySearchQuery = $state('');
  targetSeasonId = $state('');

  searchQuery = $state('');
  monthFilter = $state('');
  /**
   * Le compte sur lequel on rapproche. Vide = tous, mais ce n'est pas le défaut.
   *
   * Un rapprochement est une preuve qui se pose **compte par compte** : l'identité vérifiée par
   * l'état — solde du relevé = solde des livres − non pointées + non comptabilisées — n'a de sens
   * que sur un compte. L'écran s'ouvre donc sur celui qui a le plus à traiter (cf. constructeur),
   * et non sur un mélange dont aucun état ne rend compte.
   */
  accountFilter = $state('');
  memberHighlightedIndex = $state(-1);
  categoryHighlightedIndex = $state(-1);

  isClosed = $derived(
    this.seasons.find((s) => s.code === this.selectedSeason || String(s.id) === this.selectedSeason)?.closed || false
  );
  categories = $derived<CategoryOption[]>(
    this.dbCategories.filter((c: any) => c.active !== false).map((c: any) => ({ id: String(c.id), code: c.code, name: c.adminLabel }))
  );
  sortedMembers = $derived([...this.members].sort((a, b) => a.lastName.localeCompare(b.lastName)));

  suggestions = $derived(this.selectedTx ? this.getSuggestions(this.selectedTx) : []);
  linkedGlTxs = $derived(
    this.selectedTx ? this.glTransactions.filter((gt) => gt.bankStatementLineId === this.selectedTx!.id) : []
  );
  totalLinked = $derived(
    this.linkedGlTxs.reduce((sum, gt) => sum + Math.abs((gt as any).amountCents ?? gt.amount ?? 0), 0)
  );
  remainingAmount = $derived(
    this.selectedTx ? Math.abs((this.selectedTx as any).amountCents ?? this.selectedTx.amount ?? 0) - this.totalLinked : 0
  );

  pendingCount = $derived(this.bankStatementLines.filter((t) => t.status === 'pending').length);
  reconciledCount = $derived(this.bankStatementLines.filter((t) => t.status === 'reconciled').length);
  ignoredCount = $derived(this.bankStatementLines.filter((t) => t.status === 'ignored').length);
  selectedSum = $derived(
    this.unpaidInvoices.filter((i) => this.selectedInvoiceIds.has(i.id)).reduce((acc, i) => acc + i.totalAmount, 0)
  );

  /**
   * Les comptes présents dans le relevé, avec ce qu'il leur reste à traiter.
   *
   * Construits depuis les lignes elles-mêmes, et non depuis les états : une ligne peut appartenir
   * à un compte dont aucun relevé n'a encore été arrêté, et elle ne doit pas disparaître du filtre
   * pour autant. Les libellés viennent des états quand ils existent.
   */
  accountOptions = $derived.by(() => {
    const labels = new Map<string, string>(
      (this.reconciliationStatements ?? []).map((s: any) => [String(s.account?.id), s.account?.label])
    );
    const pending = new Map<string, number>();
    const total = new Map<string, number>();
    for (const line of this.bankStatementLines) {
      const id = String((line as any).accountId);
      total.set(id, (total.get(id) ?? 0) + 1);
      if (line.status === 'pending') pending.set(id, (pending.get(id) ?? 0) + 1);
    }
    return [...total.keys()]
      .map((id) => ({ id, label: labels.get(id) ?? `Compte #${id}`, pendingCount: pending.get(id) ?? 0 }))
      .sort((a, b) => b.pendingCount - a.pendingCount || a.label.localeCompare(b.label));
  });

  /** Vrai tant que le relevé ne porte qu'un seul compte : le filtre n'a alors rien à trancher. */
  isSingleAccount = $derived(this.accountOptions.length <= 1);

  /** La file : ce qui reste à décider, et rien d'autre. */
  queueTransactions = $derived(this.bankStatementLines.filter((t) => t.status === 'pending' && this.matchesFilters(t)));
  /** L'archive : rapprochées ou ignorées, selon l'onglet consulté. */
  historyTransactions = $derived(this.bankStatementLines.filter((t) => t.status === this.activeTab && this.matchesFilters(t)));
  /* Ce que la vue courante affiche. `pickNextId` s'en sert pour avancer d'une ligne à l'autre. */
  displayedTransactions = $derived(this.view === 'history' ? this.historyTransactions : this.queueTransactions);

  memberDisplayVal = $derived.by(() => {
    if (!this.selectedMemberId) return '';
    const m = this.members.find((x) => x.id.toString() === this.selectedMemberId);
    return m ? `${m.lastName} ${m.firstName}` : '';
  });
  categoryDisplayVal = $derived.by(() => this.categories.find((c) => c.id === this.category)?.name || '');
  filteredCategories = $derived(
    this.categorySearchQuery.trim() === ''
      ? this.categories
      : this.categories.filter((c) => c.name.toLowerCase().includes(this.categorySearchQuery.toLowerCase()))
  );

  /**
   * L'annuaire filtré, dé-accentué une fois par adhérent et non deux.
   *
   * Chaque frappe redéaccentuait deux chaînes par adhérent — quatre `normalize('NFD')` et autant
   * de regex construites à la volée sur un millier d'adhérents. La clé se calcule maintenant une
   * fois, avec l'annuaire.
   */
  private memberSearchKeys = $derived(
    this.sortedMembers.map((m) => ({
      member: m,
      key: deaccent(`${m.lastName || ''} ${m.firstName || ''} ${m.licence || ''} ${m.firstName || ''} ${m.lastName || ''}`)
    }))
  );
  filteredMembers = $derived.by(() => {
    const q = deaccent(this.memberSearchQuery || '');
    if (!q) return this.sortedMembers;
    return this.memberSearchKeys.filter((e) => e.key.includes(q)).map((e) => e.member);
  });

  /* Les factures dont le montant colle exactement à la ligne : elles se signalent dans la liste.
     Le partitionnement en deux listes a disparu avec le troisième onglet — la reprise les propose
     toutes, en marquant celles qui tombent juste. */
  matchingInvoices = $derived(
    this.selectedTx && this.selectedTx.amount > 0
      ? this.unpaidInvoices.filter((inv) => inv.totalAmount === this.selectedTx?.amount)
      : []
  );

  constructor(getProps: () => ReconciliationStateProps) {
    const props = getProps();
    this.bankStatementLines = props.bankStatementLines;
    this.glTransactions = props.glTransactions;
    this.seasonId = props.seasonId;
    this.seasons = props.seasons;
    this.members = props.members;
    this.dbCategories = props.dbCategories || [];
    this.reconciliationStatements = props.reconciliationStatements || [];
    this.selectedSeason = props.seasonId;
    this.targetSeasonId = props.seasonId;

    /*
      On s'ouvre sur le compte qui a le plus à traiter.

      `accountOptions` est trié par nombre de lignes en attente : le premier est celui où le
      travail attend. « Tous les comptes » reste proposé, mais ne peut pas être le défaut — la file
      correspondrait alors à aucun des états affichés au-dessus.
    */
    this.accountFilter = this.accountOptions[0]?.id ?? '';

    /*
      Les actions sont posées sur l'instance, et non héritées.

      Elles vivent dans des modules à part — le fichier passerait autrement les mille lignes — et
      reçoivent l'instance pour la muter. Les poser ici garde le contrat que l'écran connaît :
      `state.handleIgnore(…)` comme `state.pendingCount`, sans que l'appelant sache d'où vient quoi.
    */
    Object.assign(this, createReconciliationActions(this as any));

    this.registerEffects();
  }

  /** Les filtres de recherche, communs à la file et à l'archive. */
  matchesFilters(t: BankStatementLine) {
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      if (!(t.name || '').toLowerCase().includes(query) && !(t.memo || '').toLowerCase().includes(query)) return false;
    }
    if (this.monthFilter && !t.date.includes(`-${this.monthFilter}-`)) return false;
    if (this.accountFilter && String((t as any).accountId) !== this.accountFilter) return false;
    return true;
  }

  /**
   * Les écritures non pointées qui pourraient correspondre : même montant, sens compatible, ±7 jours.
   *
   * Les dates sont pré-calculées avec le grand livre plutôt qu'à chaque appel : la version
   * précédente instanciait deux `Date` par écriture à chaque sélection de ligne, soit quelques
   * milliers d'allocations par clic.
   */
  private unpointedByAmount = $derived.by(() => {
    const byAmount = new Map<number, { entry: GLTransaction; time: number }[]>();
    for (const gt of this.glTransactions) {
      if (gt.bankStatementLineId) continue;
      const amount = Math.abs((gt as any).amountCents ?? gt.amount ?? 0);
      if (!byAmount.has(amount)) byAmount.set(amount, []);
      byAmount.get(amount)!.push({ entry: gt, time: new Date(gt.date).getTime() });
    }
    return byAmount;
  });

  getSuggestions(bt: BankStatementLine): GLTransaction[] {
    const btAmt = (bt as any).amountCents ?? bt.amount ?? 0;
    const candidates = this.unpointedByAmount.get(Math.abs(btAmt));
    if (!candidates) return [];

    const isBankDebit = btAmt < 0;
    const btTime = new Date(bt.date).getTime();
    return candidates
      .filter(({ entry, time }) => {
        if (isBankDebit && entry.type === 'recette') return false;
        if (!isBankDebit && entry.type === 'depense') return false;
        return Math.abs(btTime - time) / 86400000 <= 7;
      })
      .map(({ entry }) => entry);
  }

  /**
   * `$effect` hors d'un composant lève ; les tests instancient pourtant l'état directement.
   *
   * On les enregistre donc sous garde, comme avant. Ce n'est pas de la complaisance : ces effets
   * ne servent qu'à préremplir un formulaire, et un test de logique n'en a pas besoin.
   */
  private registerEffects() {
    const safeEffect = (fn: () => void) => { try { $effect(fn); } catch { /* hors composant */ } };

    safeEffect(() => {
      const _ = `${this.view}:${this.activeTab}`;
      this.searchQuery = ''; this.monthFilter = '';
    });

    /*
      L'exercice de rattachement n'est **pas** remis à zéro ici, mais avec le reste du
      préremplissage, plus bas : cet effet-ci suit aussi le montant restant, et se rejoue
      donc à chaque rechargement des écritures liées. Il aurait effacé en silence l'exercice
      que la suggestion — ou la comptable — venait de poser.
    */
    safeEffect(() => {
      if (this.selectedTx) {
        this.amountToLink = parseFloat((this.remainingAmount / 100).toFixed(2));
        this.memberSearchQuery = ''; this.categorySearchQuery = '';
        this.selectedInvoiceIds = new Set(); this.isSplitMode = false; this.splits = [];
      }
    });

    safeEffect(() => { if (this.selectedSeason) (this as any).loadUnpaidInvoices(); });

    /*
      La sélection ne se restaure plus depuis `sessionStorage`.

      Les deux effets qui l'y écrivaient puis l'y relisaient n'existaient que pour survivre au
      rechargement complet de la page après chaque rapprochement. Sans rechargement, la sélection
      n'est jamais perdue — et `pickNextId` la fait avancer sur la ligne suivante de la file.
    */
    safeEffect(() => {
      if (this.selectedTx && this.selectedTx.id !== this.lastProcessedTxId) {
        this.lastProcessedTxId = this.selectedTx.id;
        this.prefillFromSuggestion(this.selectedTx);
      } else if (!this.selectedTx) {
        this.lastProcessedTxId = null;
        this.resetEntryFields();
      }
    });

    safeEffect(() => { if (!this.isMemberDropdownOpen) this.memberHighlightedIndex = -1; });
    safeEffect(() => { if (!this.isCategoryDropdownOpen) this.categoryHighlightedIndex = -1; });
  }

  private resetEntryFields() {
    this.selectedMemberId = '';
    this.accrualType = 'normal';
    this.accrualNote = '';
    this.targetSeasonId = this.selectedSeason;
  }

  /** Le formulaire reprend la suggestion de la ligne — et reste modifiable. */
  private prefillFromSuggestion(line: BankStatementLine) {
    if (!line.aiSuggestions) {
      this.resetEntryFields();
      return;
    }
    try {
      const sug = JSON.parse(line.aiSuggestions);
      this.selectedMemberId = sug.memberId ? sug.memberId.toString() : '';
      if (sug.category) this.category = sug.category.toString();
      // Rattachement d'exercice déduit du libellé (cotisation encaissée d'avance) :
      // il se préremplit comme le reste, et reste modifiable.
      this.accrualType = sug.accrualType || 'normal';
      this.accrualNote = sug.accrualNote || '';
      /*
        L'exercice de rattachement fait partie de la suggestion, et pas seulement de sa note.

        « Valider cette suggestion » enregistre le formulaire tel qu'il est affiché. Tant que ce
        champ restait sur l'exercice consulté, le raccourci produisait une écriture qui se
        contredisait : un produit constaté d'avance, une note disant « à rattacher à 26-27 », et un
        `season_id` valant 25-26 — donc un encaissement compté dans le résultat de l'exercice qui se
        clôture. Personne ne pouvait le voir : c'est le seul champ de la suggestion qui ne
        s'affichait pas.
      */
      this.targetSeasonId = sug.targetSeason || this.selectedSeason;
    } catch {
      this.resetEntryFields();
    }
  }
}

/** Minuscules et sans accents : la forme sous laquelle une recherche se compare. */
function deaccent(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Ce que l'écran manipule : l'état **et** les actions posées dessus.
 *
 * Le type porte les deux, sans quoi `state.handleIgnore(…)` n'aurait de sens nulle part — on
 * aurait remplacé une table recopiée à la main par un contrat tout aussi muet.
 *
 * Portée réelle de la vérification : les modules `.ts` — actions, rapiéçage, tests — sont
 * contrôlés par `tsc`, et une propriété absente ou mal orthographiée y échoue désormais à la
 * compilation, ce que le `Proxy` ne pouvait pas faire. Les `.svelte`, eux, ne sont typés par
 * personne : `svelte-check` n'est ni installé ni lancé en CI. Ce type leur sert dans l'éditeur,
 * pas au portillon.
 */
export type ReconciliationState = ReconciliationStore & ReturnType<typeof createReconciliationActions>;

export function createReconciliationState(
  initialPropsOrGetter: ReconciliationStateProps | (() => ReconciliationStateProps)
): ReconciliationState {
  const getProps = typeof initialPropsOrGetter === 'function' ? initialPropsOrGetter : () => initialPropsOrGetter;
  return new ReconciliationStore(getProps) as ReconciliationState;
}
