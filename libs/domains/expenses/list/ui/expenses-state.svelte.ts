import type { Expense } from './expenses-types';

export class ExpensesState {
  activeTab = $state<'pending' | 'history'>('pending');
  searchTerm = $state('');
  selectedPhoto = $state<string | null>(null);

  submittingId = $state<number | null>(null);
  errorMsg = $state('');
  successMsg = $state('');

  editingId = $state<number | null>(null);
  editDescription = $state('');
  editCategory = $state('');
  editSeasonId = $state('');
  editAmountStr = $state('');
  isSaving = $state(false);

  startEdit(exp: Expense) {
    this.editingId = exp.id;
    this.editDescription = exp.description;
    this.editCategory = exp.category;
    this.editSeasonId = exp.seasonId;
    this.editAmountStr = (exp.amount / 100).toFixed(2);
  }
}
