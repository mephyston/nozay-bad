import { AppError } from '@nba/db';

export class MemberNotFoundError extends AppError {
  constructor(message = 'Membre introuvable') {
    super(message, 404);
    this.name = 'MemberNotFoundError';
  }
}

export class MemberNotFullyPaidError extends AppError {
  constructor(message = "L'adhérent n'a pas entièrement réglé sa cotisation.") {
    super(message, 400);
    this.name = 'MemberNotFullyPaidError';
  }
}

export class SeasonNotFoundError extends AppError {
  constructor(message = 'Saison inconnue.') {
    super(message, 400);
    this.name = 'SeasonNotFoundError';
  }
}

export class ClubFunctionConflictError extends AppError {
  constructor(message = 'Cette fonction a déjà un titulaire sur la saison.') {
    super(message, 409);
    this.name = 'ClubFunctionConflictError';
  }
}

export class CsvHeadersInvalidError extends AppError {
  constructor(message = 'En-têtes CSV invalides. Colonnes requises manquantes (Licence, Saison, Nom, Prénom, Sexe, Date naissance, Tarif/Type).') {
    super(message, 400);
    this.name = 'CsvHeadersInvalidError';
  }
}

export class InvalidSignatureError extends AppError {
  constructor(message = 'Signature invalide : un fichier JPEG est attendu.') {
    super(message, 400);
    this.name = 'InvalidSignatureError';
  }
}

export class SignatureTooLargeError extends AppError {
  constructor(message = 'Signature trop volumineuse.') {
    super(message, 413);
    this.name = 'SignatureTooLargeError';
  }
}

export class InvalidPhotoTypeError extends AppError {
  constructor(message = 'Format de photo non accepté : une image JPEG, PNG, WebP ou AVIF est attendue.') {
    super(message, 415);
    this.name = 'InvalidPhotoTypeError';
  }
}

export class PhotoTooLargeError extends AppError {
  constructor(message = 'Photo trop volumineuse : 2 Mo maximum.') {
    super(message, 413);
    this.name = 'PhotoTooLargeError';
  }
}

export class EmptyPhotoError extends AppError {
  constructor(message = 'Fichier vide.') {
    super(message, 400);
    this.name = 'EmptyPhotoError';
  }
}

export class PhotoNotFoundError extends AppError {
  constructor(message = 'Aucune photo pour cet adhérent.') {
    super(message, 404);
    this.name = 'PhotoNotFoundError';
  }
}
