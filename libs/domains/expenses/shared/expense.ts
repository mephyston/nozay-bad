export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseData {
  id: number;
  seasonId: string;
  description: string;
  category: number;
  amount: number;
  photoUrl: string | null;
  status: ExpenseStatus;
  emitterName: string;
  memberId: number | null;
  ledgerEntryId: number | null;
  createdAt: Date;
}

export class Expense {
  constructor(private readonly data: ExpenseData) {}

  get status(): ExpenseStatus {
    return this.data.status;
  }

  get seasonId(): string {
    return this.data.seasonId;
  }

  canBeApproved(): boolean {
    return this.data.status === 'pending';
  }

  canBeRejected(): boolean {
    return this.data.status === 'pending';
  }

  canBeCancelled(): boolean {
    return this.data.status !== 'pending';
  }
}
