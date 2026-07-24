export class BankStatementLine {
  id: number;
  status: string;
  amount: number;
  seasonId: string;
  date: string;
  label: string;

  constructor(data: { id: number; status?: string; amount: number; seasonId: string; date: string; label: string }) {
    this.id = data.id;
    this.status = data.status || 'pending';
    this.amount = data.amount;
    this.seasonId = data.seasonId;
    this.date = data.date;
    this.label = data.label;
  }

  canBeReconciled(): boolean {
    return this.status === 'pending';
  }
}
