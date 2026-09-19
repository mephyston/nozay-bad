export interface Transaction {
  id: number;
  seasonId: string;
  type: 'recette' | 'depense' | 'transfert';
  /** L'identifiant numérique du compte, tel que l'API le projette. */
  accountId: number;
  /** De quel côté du virement se tient l'écriture ; `null` pour une recette ou une dépense. */
  transferLeg?: 'source' | 'destination' | null;
  /** Le virement parent d'une jambe ; `null` pour une recette ou une dépense. */
  transferId?: number | null;
  /** Le compte d'en face, lu sur la jambe jumelle : sans lui, entrant et sortant se ressemblent. */
  counterpartAccountId?: number | null;
  /** La date de valeur de la jambe jumelle : le formulaire d'un virement porte les deux dates. */
  counterpartDate?: string | null;
  category: string | null;
  categoryId?: number | null;
  amount: number;
  date: string;
  paymentMethod: string;
  description: string;
  reference: string | null;
  memberId?: number | null;
  bankStatementLineId?: number | null;
  memberName?: string | null;
  memberLicence?: string | null;
  runningBalanceCents?: number;
  /** Rattachement d'exercice : `normal`, ou l'un des quatre cut-off. */
  accrualType?: string | null;
  accrualNote?: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BalanceReport {
  /** Code du compte, lu de `accounts` : plus une union figée depuis que les comptes sont des données. */
  accountId: string;
  /** Identifiant numérique du compte, celui que portent les écritures. */
  id?: number;
  /** Libellé du compte, lu de `accounts`. C'est lui qui nomme les cartes et les sélecteurs. */
  label?: string;
  /** Compte de tiers (classe 4) : son solde est une dette envers les adhérents, pas de la trésorerie. */
  thirdParty?: boolean;
  /** Bons et chèques tiers en attente de remboursement : à encaisser, hors disponibilités. */
  receivable?: boolean;
  initialBalance: number;
  /** Solde COMPTABLE : à-nouveau + écritures. Ce n'est pas le solde du relevé. */
  finalBalance: number;
  inVaultCents?: number;
  pendingDebitCents?: number;
  /** Ce que le relevé devrait afficher : comptable − chèques en coffre + débits différés. */
  bankTheoreticalCents?: number;
  /** Ce que le relevé affiche vraiment. Absent tant qu'aucun n'a été importé. */
  statementBalanceCents?: number | null;
  statementDate?: string | null;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface Category {
  id: string;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;
}

export interface AccountClass {
  code: string;
  label: string;
  type: 'recette' | 'depense';
}

// Les moyens de paiement viennent de la configuration du club (`/accounting/payment-methods`) :
// les écrans les reçoivent en props, plus de table de libellés ici.
