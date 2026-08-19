export interface CreateCheckInput {
  seasonId: string;
  number: string;
  amount: number;
  emitter: string;
  bank?: string;
  memberId?: number;
  category?: string | number;
  description?: string;
  date?: string;
  photoUrl?: string;
}

export interface AnalyzeCheckOutput {
  number: string;
  amount: number;
  emitter: string;
  bank: string;
  memberId: number | null;
  memberName: string | null;
  date: string | null;
}
