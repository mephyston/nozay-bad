import { AppError } from '@metacult/shared-db';

export class SeasonClosedError extends AppError {
  constructor(message = 'La saison est clôturée.') {
    super(message, 400);
    this.name = 'SeasonClosedError';
  }
}

export class InvoiceNotFoundError extends AppError {
  constructor(message = 'Facture introuvable') {
    super(message, 404);
    this.name = 'InvoiceNotFoundError';
  }
}

export class InvoiceNotEditableError extends AppError {
  constructor(message = 'Modification impossible car non au statut Brouillon') {
    super(message, 400);
    this.name = 'InvoiceNotEditableError';
  }
}

export class InvoiceNotDeletableError extends AppError {
  constructor(message = 'Seules les factures brouillon ou annulées peuvent être supprimées') {
    super(message, 400);
    this.name = 'InvoiceNotDeletableError';
  }
}

export class InvalidStatusError extends AppError {
  constructor(message = 'Statut invalide') {
    super(message, 400);
    this.name = 'InvalidStatusError';
  }
}
