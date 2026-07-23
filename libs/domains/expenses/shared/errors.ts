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
