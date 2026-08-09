import { AppError } from '@nba/db';

export class CmsPageNotFoundError extends AppError {
  constructor(message = 'Page introuvable') {
    super(message, 404);
    this.name = 'CmsPageNotFoundError';
  }
}

export class CmsPathConflictError extends AppError {
  constructor(path: string) {
    // Le brouillon est mentionné explicitement : le conflit vient souvent d'une page
    // non publiée, donc invisible sur le site, et l'utilisateur la cherche en vain.
    super(`L'adresse « ${path} » est déjà prise par une autre page, brouillon compris.`, 409);
    this.name = 'CmsPathConflictError';
  }
}

export class CmsInvalidSlugError extends AppError {
  constructor(message = "L'adresse d'une page ne peut contenir que des minuscules, des chiffres et des tirets.") {
    super(message, 400);
    this.name = 'CmsInvalidSlugError';
  }
}

export class CmsBlockPayloadError extends AppError {
  constructor(position: number, detail: string) {
    super(`Bloc ${position + 1} : ${detail}`, 400);
    this.name = 'CmsBlockPayloadError';
  }
}

export class CmsCyclicParentError extends AppError {
  constructor(message = 'Une page ne peut pas être rangée sous elle-même ou sous une de ses sous-pages.') {
    super(message, 400);
    this.name = 'CmsCyclicParentError';
  }
}

export class CmsNavItemNotFoundError extends AppError {
  constructor(message = 'Entrée de menu introuvable') {
    super(message, 404);
    this.name = 'CmsNavItemNotFoundError';
  }
}

export class CmsNavTargetError extends AppError {
  constructor(message = 'Une entrée de menu pointe soit une page du site, soit une adresse extérieure.') {
    super(message, 400);
    this.name = 'CmsNavTargetError';
  }
}

export class CmsNavDepthError extends AppError {
  constructor(
    message = 'Un menu ne peut compter que deux niveaux : un sous-menu ne peut pas en contenir un autre.'
  ) {
    super(message, 400);
    this.name = 'CmsNavDepthError';
  }
}

export class CmsHomePageConflictError extends AppError {
  constructor(title: string) {
    super(
      `« ${title} » est déjà la page d'accueil. Changez d'abord son gabarit pour libérer la racine.`,
      409
    );
    this.name = 'CmsHomePageConflictError';
  }
}
