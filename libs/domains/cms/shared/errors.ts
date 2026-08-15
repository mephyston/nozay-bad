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

export class CmsSocialUrlError extends AppError {
  constructor(network: string) {
    super(`L'adresse ${network} doit commencer par http:// ou https://.`, 400);
    this.name = 'CmsSocialUrlError';
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

// ---------------------------------------------------------------------------
// Diffusion push d'une actualité
// ---------------------------------------------------------------------------

export class CmsPostNotFoundError extends AppError {
  constructor(message = 'Actualité introuvable') {
    super(message, 404);
    this.name = 'CmsPostNotFoundError';
  }
}

export class CmsPostNotPublishedError extends AppError {
  constructor() {
    super("Publiez l'actualité avant de la diffuser.", 409);
    this.name = 'CmsPostNotPublishedError';
  }
}

export class CmsPostAlreadyNotifiedError extends AppError {
  constructor() {
    super('Cette actualité a déjà été diffusée aux adhérents.', 409);
    this.name = 'CmsPostAlreadyNotifiedError';
  }
}

/**
 * Une actualité publique n'est pas diffusée en notification.
 *
 * La notification s'adresse aux adhérents abonnés, dans l'espace qui leur est réservé.
 * Une actualité publique vit sur le site, où elle se lit sans compte : la pousser sur
 * les téléphones du club en ferait une alerte pour une information de vitrine.
 */
export class CmsPostNotPrivateError extends AppError {
  constructor() {
    super(
      "Seule une actualité réservée aux adhérents peut être diffusée en notification.",
      409
    );
    this.name = 'CmsPostNotPrivateError';
  }
}
