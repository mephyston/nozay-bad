export interface ListChecksOutput {
  id: number;
  checkDepositId: number | null;
  seasonId: string;
  number: string;
  amount: number;
  emitter: string;
  bank: string | null;
  memberId: number | null;
  ledgerEntryId: number | null;
  status: 'received' | 'deposited' | 'cleared' | 'bounced';
  photoUrl: string | null;
  createdAt: Date;
  memberName: string | null;
  memberLicence: string | null;
}

export interface ListCheckDepositsOutput {
  id: number;
  seasonId: string;
  reference: string;
  date: string;
  amount: number;
  status: 'deposited' | 'cleared';
  bankStatementLineId: number | null;
  createdAt: Date;
}
