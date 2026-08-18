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
// Redirections
// ---------------------------------------------------------------------------

export class CmsRedirectNotFoundError extends AppError {
  constructor(message = 'Redirection introuvable') {
    super(message, 404);
    this.name = 'CmsRedirectNotFoundError';
  }
}

export class CmsRedirectLoopError extends AppError {
  constructor() {
    super('Une redirection ne peut pas pointer vers sa propre adresse.', 400);
    this.name = 'CmsRedirectLoopError';
  }
}

/**
 * Refus plutôt que résolution silencieuse : l'utilisateur qui vise une adresse
 * elle-même redirigée doit choisir la cible finale en connaissance de cause —
 * Google suit mal les chaînes, et elles diluent le référencement.
 */
export class CmsRedirectChainError extends AppError {
  constructor(viaPath: string, finalTarget: string | null) {
    super(
      finalTarget
        ? `« ${viaPath} » redirige déjà vers « ${finalTarget} » : pointez directement vers cette adresse.`
        : `« ${viaPath} » répond déjà « page supprimée » (410) : marquez plutôt cette redirection comme supprimée.`,
      400
    );
    this.name = 'CmsRedirectChainError';
  }
}

export class CmsRedirectSourceConflictError extends AppError {
  constructor(fromPath: string) {
    super(`Une redirection existe déjà pour « ${fromPath} » : modifiez-la plutôt.`, 409);
    this.name = 'CmsRedirectSourceConflictError';
  }
}

/**
 * La résolution d'URL sert la page avant de consulter les redirections : une
 * redirection posée sur l'adresse d'une page existante ne serait jamais empruntée.
 */
export class CmsRedirectShadowedError extends AppError {
  constructor(fromPath: string) {
    super(
      `« ${fromPath} » est l'adresse d'une page du site : la redirection ne serait jamais empruntée. Renommez ou supprimez d'abord la page.`,
      409
    );
    this.name = 'CmsRedirectShadowedError';
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
