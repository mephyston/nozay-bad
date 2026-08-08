import { AppError } from '@nba/db';

export class AnnouncementNotFoundError extends AppError {
  constructor(message = 'Annonce introuvable') {
    super(message, 404);
    this.name = 'AnnouncementNotFoundError';
  }
}

export class AnnouncementNotPublishedError extends AppError {
  constructor(message = "Une annonce en brouillon ne peut pas être diffusée aux adhérents.") {
    super(message, 400);
    this.name = 'AnnouncementNotPublishedError';
  }
}

export class AnnouncementAlreadyNotifiedError extends AppError {
  constructor(message = 'Cette annonce a déjà été diffusée aux adhérents.') {
    super(message, 409);
    this.name = 'AnnouncementAlreadyNotifiedError';
  }
}

export class AnnouncementEmptyBodyError extends AppError {
  constructor(message = "Le texte de l'annonce est vide.") {
    super(message, 400);
    this.name = 'AnnouncementEmptyBodyError';
  }
}
