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

export interface BankTransaction {
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


