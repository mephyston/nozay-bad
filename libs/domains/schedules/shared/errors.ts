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
 * chose au demandeur : il n'est pas de ceux à qui le bureau a confié une clé.
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

/** Le seul 403 du domaine : le demandeur n'a pas de clé. */
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

/**
 * Refus des séances individuelles.
 *
 * Même grammaire que le jeu libre : 404 quand la chose n'existe pas, 409 quand c'est
 * l'état qui s'oppose à la demande, 400 quand la demande est mal formée, et un seul 403
 * — le demandeur n'est pas d'un groupe compétiteur.
 */

export class IndivSessionNotFoundError extends AppError {
  constructor(message = 'Séance individuelle introuvable') {
    super(message, 404);
    this.name = 'IndivSessionNotFoundError';
  }
}

export class IndivSessionAlreadyExistsError extends AppError {
  constructor(message = 'Une soirée d’indiv existe déjà à cette date, dans ce gymnase, à cette heure.') {
    super(message, 409);
    this.name = 'IndivSessionAlreadyExistsError';
  }
}

export class IndivSessionCancelledError extends AppError {
  constructor(message = 'Cette soirée a été annulée.') {
    super(message, 409);
    this.name = 'IndivSessionCancelledError';
  }
}

export class IndivSessionAnnouncedError extends AppError {
  constructor(message = 'Les retenus ont déjà été annoncés : les candidatures sont closes.') {
    super(message, 409);
    this.name = 'IndivSessionAnnouncedError';
  }
}

export class IndivSessionPassedError extends AppError {
  constructor(message = 'Cette soirée est passée.') {
    super(message, 409);
    this.name = 'IndivSessionPassedError';
  }
}

/** Le seul 403 des indiv : le demandeur n'est pas d'un groupe compétiteur. */
export class NotIndivEligibleError extends AppError {
  constructor(message = 'Les séances individuelles sont réservées aux groupes compétiteurs.') {
    super(message, 403);
    this.name = 'NotIndivEligibleError';
  }
}

export class InvalidIndivSlotError extends AppError {
  constructor(message = 'Ce créneau n’existe pas sur cette soirée.') {
    super(message, 400);
    this.name = 'InvalidIndivSlotError';
  }
}

export class InvalidIndivLayoutError extends AppError {
  constructor(message = 'Les créneaux doivent tenir dans la soirée.') {
    super(message, 400);
    this.name = 'InvalidIndivLayoutError';
  }
}

export class IndivSlotFullError extends AppError {
  constructor(message = 'Ce créneau a déjà toutes ses places.') {
    super(message, 409);
    this.name = 'IndivSlotFullError';
  }
}

export class NoIndivSelectionError extends AppError {
  constructor(message = 'Retenez au moins une personne avant d’annoncer.') {
    super(message, 409);
    this.name = 'NoIndivSelectionError';
  }
}

export class IndivRequestNotFoundError extends AppError {
  constructor(message = 'Cette candidature ne relève pas de cette soirée.') {
    super(message, 400);
    this.name = 'IndivRequestNotFoundError';
  }
}

export class NoIndivSlotError extends AppError {
  constructor(message = 'Aucun créneau de séances individuelles actif dans la grille des horaires.') {
    super(message, 409);
    this.name = 'NoIndivSlotError';
  }
}
