import { AppError } from '@nba/db';

export class AdminUserNotFoundError extends AppError {
  constructor(message = 'Compte introuvable') {
    super(message, 404);
    this.name = 'AdminUserNotFoundError';
  }
}

export class DuplicateAdminUserError extends AppError {
  constructor(message = 'Un compte existe déjà pour cette adresse e-mail.') {
    super(message, 400);
    this.name = 'DuplicateAdminUserError';
  }
}

/**
 * Retirer le dernier super administrateur rendrait la configuration des accès
 * définitivement inatteignable : personne ne pourrait plus en désigner un autre.
 */
export class LastSuperAdminError extends AppError {
  constructor(
    message = 'Impossible de retirer le dernier super administrateur : désignez-en un autre au préalable.'
  ) {
    super(message, 400);
    this.name = 'LastSuperAdminError';
  }
}
