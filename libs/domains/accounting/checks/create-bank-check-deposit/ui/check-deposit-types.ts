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

export const categoriesList: CategoryItem[] = [
  { id: '1', name: 'Adhésion', code: '70' },
  { id: '2', name: 'Vente', code: '70' }
];


