import type { Expense, SelectionDePieces } from './expenses-types';
import type { PieceJointe } from '../../shared/justificatif';

export class ExpensesState {
  activeTab = $state<'pending' | 'history'>('pending');
  searchTerm = $state('');
  visionneuse = $state<SelectionDePieces | null>(null);

  submittingId = $state<number | null>(null);
  errorMsg = $state('');

  editingId = $state<number | null>(null);
  editDescription = $state('');
  editCategory = $state('');
  editSeasonId = $state('');
  editAmountStr = $state('');
  /** Les pièces telles qu'à l'ouverture : la liste n'est renvoyée que si elle a changé. */
  editPiecesOrigine: number[] = [];
  editPieces = $state<PieceJointe[]>([]);
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
    this.editPiecesOrigine = exp.attachments.map((p) => p.id);
    this.editPieces = exp.attachments.map((p) => ({ ...p }));
  }

  /** La visionneuse sur les pièces d'une note de la liste. */
  voirPieces(exp: Expense) {
    this.visionneuse = { expenseId: exp.id, pieces: exp.attachments, index: 0 };
  }

  /** La visionneuse sur les pièces de la feuille de modification, nouvelles comprises. */
  voirPieceEnCours(index: number) {
    if (this.editingId !== null) this.visionneuse = { expenseId: this.editingId, pieces: this.editPieces, index };
  }

  /**
   * La liste à envoyer, ou `undefined` si rien n'a bougé. Une pièce gardée ne repart que
   * par son identifiant : son contenu est déjà en base.
   */
  piecesModifiees(): ({ id: number } | { dataUrl: string })[] | undefined {
    const ids = this.editPieces.map((p) => p.id);
    const inchangee = ids.length === this.editPiecesOrigine.length && ids.every((id, i) => id === this.editPiecesOrigine[i]);
    if (inchangee) return undefined;
    return this.editPieces.map((p) => (p.id ? { id: p.id } : { dataUrl: p.dataUrl! }));
  }
}
