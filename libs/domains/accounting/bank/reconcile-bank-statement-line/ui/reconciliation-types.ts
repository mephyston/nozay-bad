export interface BankStatementLine {
  id: number;
  fitid: string;
  accountId: 'current' | 'savings' | 'cash';
  amount: number;
  /** Certaines réponses portent le montant en centimes sous ce nom ; `amount` sinon. */
  amountCents?: number;
  date: string;
  name: string;
  memo: string | null;
  status: 'pending' | 'reconciled' | 'ignored';
  aiSuggestions: string | null;
}

export interface GLTransaction {
  id: number;
  type: 'recette' | 'depense' | 'transfert';
  accountId: 'current' | 'savings' | 'cash';
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
}

export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  amountRemaining: number;
  /**
   * Renseigné uniquement pour un adhérent d'une **autre** saison que celle consultée.
   *
   * L'écran propose aussi l'annuaire de la saison suivante, pour rattacher une
   * cotisation encaissée d'avance. Sans ce repère, deux homonymes de deux saisons
   * seraient indiscernables dans la liste — et `id` désigne une adhésion, pas une
   * personne : se tromper de saison rattache l'argent au mauvais exercice.
   */
  seasonCode?: string;
}

export interface ReconciliationStateProps {
  bankStatementLines: BankStatementLine[];
  glTransactions: GLTransaction[];
  seasonId: string;
  seasons: Season[];
  members: Member[];
  dbCategories?: any[];
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
  displayedTransactions: BankStatementLine[];
  selectedTx: BankStatementLine | null;
  selectedTxIds: Record<number, boolean>;
  selectedInvoiceIds: Set<number>;
  unpaidInvoices: Invoice[];
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
  paymentMethod: string;
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

export const accountLabels = {
  current: 'Compte Courant',
  savings: 'Compte Livret',
  cash: 'Caisse Physique'
};
