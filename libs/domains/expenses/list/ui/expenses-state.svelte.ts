import type { Expense } from './expenses-types';

export class ExpensesState {
  activeTab = $state<'pending' | 'history'>('pending');
  searchTerm = $state('');
  selectedPhoto = $state<string | null>(null);

  submittingId = $state<number | null>(null);
  errorMsg = $state('');

  editingId = $state<number | null>(null);
  editDescription = $state('');
  editCategory = $state('');
  editSeasonId = $state('');
  editAmountStr = $state('');
  isSaving = $state(false);

  /*
    `String()` : malgré le type, l'API rend `seasonId` et `category` en entiers. Recopié
    tel quel, l'identifiant de saison repartait en nombre si l'on ne touchait pas au
    sélecteur, et `PUT /expenses/:id` (qui veut une chaîne) refusait toute modification.
  */
  startEdit(exp: Expense) {
    this.editingId = exp.id;
    this.editDescription = exp.description;
    this.editCategory = String(exp.category);
    this.editSeasonId = String(exp.seasonId);
    this.editAmountStr = (exp.amount / 100).toFixed(2);
  }
}
