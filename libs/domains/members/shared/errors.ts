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
