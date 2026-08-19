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

/**
 * 409 et non 403 : rien ne manque au demandeur, c'est l'état de l'événement qui
 * s'oppose à sa demande. Un adhérent qui laisse un onglet ouvert pendant que le bureau
 * ferme les inscriptions doit lire « c'est fermé », pas « vous n'avez pas le droit ».
 */
export class RegistrationsNotOpenError extends AppError {
  constructor(message = "Les inscriptions ne sont pas ouvertes pour cet événement.") {
    super(message, 409);
    this.name = 'RegistrationsNotOpenError';
  }
}

export class EventAlreadyPassedError extends AppError {
  constructor(message = 'Cet événement est passé.') {
    super(message, 409);
    this.name = 'EventAlreadyPassedError';
  }
}
