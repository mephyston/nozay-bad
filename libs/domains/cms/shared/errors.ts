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
