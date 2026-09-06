export interface BankStatementLine {
  id: number;
  fitid: string;
  /** Code du compte, lu de `accounts`. */
  accountId: string;
  amount: number;
  /** Certaines réponses portent le montant en centimes sous ce nom ; `amount` sinon. */
  amountCents?: number;
  date: string;
  name: string;
  memo: string | null;
  status: 'pending' | 'reconciled';
  aiSuggestions: string | null;
}

export interface GLTransaction {
  id: number;
  /** L'exercice de rattachement : un exercice clos n'accepte plus aucun pointage. */
  seasonId?: number | string;
  type: 'recette' | 'depense' | 'transfert';
  /** Code du compte, lu de `accounts`. */
  accountId: string;
  amount: number;
  /** Certaines réponses portent le montant en centimes sous ce nom ; `amount` sinon. */
  amountCents?: number;
  date: string;
  description: string;
  category?: string | null;
  bankStatementLineId?: number | null;
  memberName?: string | null;
  /** Rattachement d'exercice : `normal`, ou l'un des quatre cut-off. */
  accrualType?: string | null;
  accrualNote?: string | null;
}

export interface Season {
  id: string;
  code?: string;
  name: string;
  active: boolean;
  closed?: boolean;
  /** Bornes de l'exercice, telles que le référentiel les rend ; absentes des projections réduites. */
  startDate?: string;
  endDate?: string;
}

/** Ce qu'une facture encaissera, et sous quelle imputation. `categoryId: null` = à choisir. */
export interface InvoiceCategoryPart {
  categoryId: number | null;
  amountCents: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  seasonId: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string | null;
  clientEmail: string | null;
  subject: string | null;
  location: string | null;
  period: string | null;
  attendees: string | null;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  /** L'imputation de ses lignes, qui préremplit l'écriture au rapprochement. */
  categoryBreakdown?: InvoiceCategoryPart[];
}

export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  amountRemaining: number;
  /**
   * L'exercice de l'adhésion. **Obligatoire**, sur chacune.
   *
   * `id` désigne une adhésion, pas une personne : la même personne en porte une par
   * exercice, avec un identifiant différent. Se tromper d'exercice rattache donc l'argent à
   * la mauvaise adhésion — une erreur qu'aucun contrôle ne rattrape.
   *
   * Le champ était facultatif, et son absence signifiait « exercice consulté ». Cette
   * convention muette se retournait dès que l'exercice VISÉ n'était pas celui qu'on
   * consultait : une ligne d'août rapprochée depuis 26-27 vise 25-26, et le filtre cherchait
   * alors un code que personne ne portait — la liste s'affichait vide, sans un mot. Un
   * marqueur implicite ne se voit pas quand il manque ; celui-ci est désormais exigé.
   */
  seasonCode: string;
}

export interface ReconciliationStateProps {
  bankStatementLines: BankStatementLine[];
  glTransactions: GLTransaction[];
  seasonId: string;
  seasons: Season[];
  members: Member[];
  dbCategories?: any[];
  /**
   * L'état de rapprochement par compte, rendu au-dessus de la file.
   *
   * Il vit dans le même état que le reste depuis qu'il doit se rafraîchir après chaque écriture :
   * en île séparée, il ne pouvait se mettre à jour que par un rechargement de la page.
   */
  reconciliationStatements?: any[];
}

/** Catégorie comptable telle que présentée dans les sélecteurs. */
export interface CategoryOption {
  id: string;
  code?: string;
  name: string;
}

/** Ligne d'une ventilation en cours de saisie (montant en euros). */
export interface SplitRow {
  category: string;
  amount: number;
  /**
   * La facture que cette part encaisse, s'il y en a une.
   *
   * Un virement couvrant trois factures n'est pas un mode de rapprochement à part : c'est une
   * ventilation en trois parts, chacune portant sa facture. Le modèle savait déjà l'écrire —
   * l'écran, lui, produisait une écriture unique « Rapprochement de N factures » ne retenant
   * qu'un seul identifiant, les autres factures passant `paid` sans rien pour les porter.
   */
  invoiceId?: number | null;
  /** L'adhérent de cette part ; deux cotisations réglées d'un seul virement en ont deux. */
  memberId?: number | null;
  /** Libellé propre à la part ; à défaut, celui de la ligne bancaire suffixé du rang. */
  label?: string;
}

/**
 * Champs de l'état du rapprochement vus par les modules d'actions.
 *
 * L'état réel vit dans `reconciliation.svelte.ts` (runes + proxy) ; les actions ne
 * peuvent pas référencer son type de retour sans créer un cycle de types, d'où cette
 * interface structurelle. Elle remplace le `s: any` historique : un champ renommé ou
 * retypé côté état casse désormais la compilation des actions au lieu de casser
 * l'écran en production.
 */
export interface ReconciliationStateFields {
  bankStatementLines: BankStatementLine[];
  glTransactions: GLTransaction[];
  /** Le référentiel des exercices, avec leurs bornes : l'exercice d'une écriture se déduit de sa date. */
  seasons: Season[];
  pointableEntries: GLTransaction[];
  reconciliationStatements: any[];
  displayedTransactions: BankStatementLine[];
  queueTransactions: BankStatementLine[];
  historyTransactions: BankStatementLine[];
  /** `queue` = ce qui reste à décider ; `history` = les archives. */
  view: 'queue' | 'history';
  /** Compte sur lequel on rapproche ; vide = tous. */
  accountFilter: string;
  accountOptions: { id: string; label: string; pendingCount: number }[];
  isSingleAccount: boolean;
  selectedTx: BankStatementLine | null;
  selectedInvoiceIds: Set<number>;
  unpaidInvoices: Invoice[];
  /** Onglet du panneau : saisir/ventiler, ou pointer une écriture existante. */
  activeRightTab: 'manual' | 'ledger';
  selectedSum: number;
  remainingAmount: number;
  splits: SplitRow[];
  isSplitMode: boolean;
  isSubmitting: boolean;
  isAnalyzing: boolean;
  isAnalyzingSingle: boolean;
  errorMsg: string;
  selectedSeason: string;
  selectedAccount: string;
  category: string;
  accrualType: string;
  accrualNote: string;
  amountToLink: number;
  selectedMemberId: string;
  memberSearchQuery: string;
  isMemberDropdownOpen: boolean;
  memberHighlightedIndex: number;
  filteredMembers: Member[];
  categories: CategoryOption[];
  filteredCategories: CategoryOption[];
  categorySearchQuery: string;
  /**
   * Exercice auquel l'écriture est rattachée — pas celui où l'argent est arrivé.
   *
   * Le compte de résultat lit `season_id` pour dire ce qui appartient à l'exercice, et
   * la trésorerie lit la **date** pour dire ce qui est sur le compte. Une cotisation
   * encaissée en août pour la rentrée porte donc la saison suivante et une date d'août :
   * c'est cet écart, et lui seul, que le cut-off « produit constaté d'avance » décrit.
   */
  targetSeasonId: string;
  isCategoryDropdownOpen: boolean;
  categoryHighlightedIndex: number;
}
