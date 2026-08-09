import { AppError } from '@nba/db';

export class ClubEventNotFoundError extends AppError {
  constructor(message = 'Événement introuvable') {
    super(message, 404);
    this.name = 'ClubEventNotFoundError';
  }
}

export class InvalidEventDatesError extends AppError {
  constructor(message = "La fin d'un événement ne peut pas précéder son début.") {
    super(message, 400);
    this.name = 'InvalidEventDatesError';
  }
}
