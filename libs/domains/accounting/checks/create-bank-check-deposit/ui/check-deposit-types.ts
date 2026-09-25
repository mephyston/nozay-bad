export interface Check {
  id: number;
  checkDepositId: number | null;
  seasonId: string;
  number: string;
  amount: number;
  emitter: string;
  bank: string | null;
  memberId: number | null;
  ledgerEntryId: number | null;
  status: 'received' | 'deposited';
  photoUrl: string | null;
  /** Mois calendaire (1-12) de remise prévu, indicatif ; le tableau arrive trié dessus. */
  plannedDepositMonth: number | null;
  createdAt: string;
  /** Date d'émission et catégorie, portées par la recette liée (null pour un chèque orphelin). */
  date: string | null;
  categoryId: number | null;
  memberName: string | null;
  memberLicence: string | null;
}

export interface CheckDeposit {
  id: number;
  seasonId: string;
  reference: string;
  date: string;
  amount: number;
  status: 'pending' | 'deposited' | 'cleared';
  bankStatementLineId: number | null;
  createdAt: string;
}

export interface Member {
  id: number;
  licence: string;
  lastName: string;
  firstName: string;
  parent1Name: string | null;
  parent2Name: string | null;
}

export interface BankStatementLine {
  id: number;
  fitid: string;
  amount: number;
  date: string;
  name: string;
  memo: string | null;
  status: string;
}

export interface SeasonOption {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  code?: string;
}

/** Une catégorie du plan, telle que `/accounting/categories` la renvoie. */
export interface PlanCategory {
  id: number;
  adminLabel: string;
  receiptCode?: string | null;
  receiptAccountClassId?: number | null;
  active?: boolean | null;
}

/**
 * Les affectations proposées pour un chèque : les catégories de recette du plan.
 *
 * Le formulaire tenait sa propre liste, « Adhésion » et « Vente » sous les identifiants
 * 1 et 2 : un don n'y avait pas sa place, et l'identifiant partait tel quel en base, où
 * rien ne garantissait qu'il désignât la catégorie affichée. Un chèque est toujours une
 * recette : seules les catégories actives munies d'une imputation de recette s'offrent.
 *
 * `conserver` garde la catégorie d'un chèque déjà saisi même si elle ne remplit plus ces
 * conditions, pour que sa modification ne l'efface pas en silence.
 */
export function receiptCategories(plan: PlanCategory[], conserver?: number | null): CategoryItem[] {
  return plan
    .filter(
      (c) =>
        c.id === conserver ||
        (c.active !== false && (c.receiptAccountClassId != null || !!c.receiptCode))
    )
    .map((c) => ({ id: String(c.id), name: c.adminLabel, code: c.receiptCode ?? undefined }));
}


