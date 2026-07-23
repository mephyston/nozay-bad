export class Check {
  id: number;
  status: string;
  amount: number;
  number: string;
  emitter: string;
  seasonId: string;

  constructor(data: { id: number; status?: string; amount: number; number: string; emitter?: string; seasonId: string }) {
    this.id = data.id;
    this.status = data.status || 'received';
    this.amount = data.amount;
    this.number = data.number;
    this.emitter = data.emitter || '';
    this.seasonId = data.seasonId;
  }

  canBeDeposited(): boolean {
    return this.status === 'received' || this.status === 'pending';
  }

  canBeCleared(): boolean {
    return this.status === 'deposited';
  }
}
