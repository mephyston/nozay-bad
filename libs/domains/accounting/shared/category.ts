export class Category {
  id: number;
  adminLabel: string;
  adherentLabel: string;
  hideInExpenses: boolean;

  constructor(data: { id: number; adminLabel: string; adherentLabel: string; hideInExpenses?: boolean }) {
    this.id = data.id;
    this.adminLabel = data.adminLabel;
    this.adherentLabel = data.adherentLabel;
    this.hideInExpenses = !!data.hideInExpenses;
  }

  canBeExpense(): boolean {
    return !this.hideInExpenses;
  }
}
