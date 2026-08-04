import { AppError } from '@nba/db';

export class SeasonClosedError extends AppError {
  constructor(message = 'La saison est clôturée.') {
    super(message, 400);
    this.name = 'SeasonClosedError';
  }
}

export class ExpenseNotFoundError extends AppError {
  constructor(message = 'Dépense introuvable') {
    super(message, 404);
    this.name = 'ExpenseNotFoundError';
  }
}

// M-01 : l'adhérent n'est pas autorisé aux notes de frais (revalidation serveur).
export class MemberNotEligibleError extends AppError {
  constructor(message = 'Adhérent non autorisé aux notes de frais.') {
    super(message, 403);
    this.name = 'MemberNotEligibleError';
  }
}

export class ExpenseAlreadyProcessedError extends AppError {
  constructor(message = 'Dépense déjà traitée') {
    super(message, 400);
    this.name = 'ExpenseAlreadyProcessedError';
  }
}

export class ExpenseAlreadyPendingError extends AppError {
  constructor(message = 'Dépense déjà en attente') {
    super(message, 400);
    this.name = 'ExpenseAlreadyPendingError';
  }
}
