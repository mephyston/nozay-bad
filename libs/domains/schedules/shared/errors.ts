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

/**
 * Refus du jeu libre.
 *
 * Tous en 409 sauf un : « rien ne manque au demandeur, c'est l'état qui s'oppose à sa
 * demande ». `NotAnOpenerError` fait exception et vaut 403 — là, il manque bien quelque
 * chose au demandeur : il n'est pas de ceux à qui le bureau a confié un badge.
 */

export class OpenPlaySessionNotFoundError extends AppError {
  constructor(message = 'Séance introuvable') {
    super(message, 404);
    this.name = 'OpenPlaySessionNotFoundError';
  }
}

export class OpenPlaySessionAlreadyExistsError extends AppError {
  constructor(message = 'Une séance existe déjà à cette date, dans ce gymnase, à cette heure.') {
    super(message, 409);
    this.name = 'OpenPlaySessionAlreadyExistsError';
  }
}

export class OpenPlaySessionCancelledError extends AppError {
  constructor(message = 'Cette séance a été annulée.') {
    super(message, 409);
    this.name = 'OpenPlaySessionCancelledError';
  }
}

export class OpenPlaySessionPassedError extends AppError {
  constructor(message = 'Cette séance est passée.') {
    super(message, 409);
    this.name = 'OpenPlaySessionPassedError';
  }
}

export class InvalidSessionDateError extends AppError {
  constructor(message = 'Date invalide.') {
    super(message, 400);
    this.name = 'InvalidSessionDateError';
  }
}

export class InvalidGuestNameError extends AppError {
  constructor(message = 'Renseignez le prénom et le nom de chaque invité, ou retirez la ligne.') {
    super(message, 400);
    this.name = 'InvalidGuestNameError';
  }
}

export class TooManyGuestsError extends AppError {
  constructor(message = 'Trois invités au maximum par adhérent.') {
    super(message, 400);
    this.name = 'TooManyGuestsError';
  }
}

/** Le seul 403 du domaine : le demandeur n'a pas de badge. */
export class NotAnOpenerError extends AppError {
  constructor(message = 'Vous ne faites pas partie des ouvreurs désignés.') {
    super(message, 403);
    this.name = 'NotAnOpenerError';
  }
}

export class SessionAlreadyClaimedError extends AppError {
  constructor(message = 'Un autre bénévole ouvre déjà cette séance.') {
    super(message, 409);
    this.name = 'SessionAlreadyClaimedError';
  }
}

export class NotTheOpenerError extends AppError {
  constructor(message = "Vous n'êtes pas l'ouvreur de cette séance.") {
    super(message, 409);
    this.name = 'NotTheOpenerError';
  }
}

export class MissingOpenerError extends AppError {
  constructor(message = 'Une séance ne peut être confirmée sans ouvreur.') {
    super(message, 409);
    this.name = 'MissingOpenerError';
  }
}

export class MissingCancellationReasonError extends AppError {
  constructor(message = "Indiquez pourquoi la séance est annulée : l'adhérent inscrit doit pouvoir le lire.") {
    super(message, 400);
    this.name = 'MissingCancellationReasonError';
  }
}

export class NoOpenPlaySlotError extends AppError {
  constructor(message = 'Aucun créneau de jeu libre actif sur cette saison.') {
    super(message, 409);
    this.name = 'NoOpenPlaySlotError';
  }
}

export class RangeTooWideError extends AppError {
  constructor(message = 'La période ne peut pas dépasser un an.') {
    super(message, 400);
    this.name = 'RangeTooWideError';
  }
}
