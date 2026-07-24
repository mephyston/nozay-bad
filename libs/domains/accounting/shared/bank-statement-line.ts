export class BankStatementLine {
  id: number;
  status: string;
  amount: number;
  seasonId: string;
  date: string;
  label: string;

  constructor(data: any) {
    this.id = data.id;
    this.status = data.status || 'pending';
    this.amount = data.amountCents ?? data.amount ?? 0;
    this.seasonId = data.seasonId ?? '';
    this.date = data.date;
    this.label = data.name ?? data.label ?? '';
  }

  canBeReconciled(): boolean {
    return this.status === 'pending';
  }
}
