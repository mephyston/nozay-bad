import { AppError } from '@nba/db';

export class ScheduleSlotNotFoundError extends AppError {
  constructor(message = 'Créneau introuvable') {
    super(message, 404);
    this.name = 'ScheduleSlotNotFoundError';
  }
}

export class VenueNotFoundError extends AppError {
  constructor(message = 'Gymnase introuvable') {
    super(message, 404);
    this.name = 'VenueNotFoundError';
  }
}

export class InvalidSlotTimesError extends AppError {
  constructor(message = "L'heure de fin doit suivre l'heure de début.") {
    super(message, 400);
    this.name = 'InvalidSlotTimesError';
  }
}
