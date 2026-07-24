import { AppError } from '@nba/db';

export class ProductNotFoundError extends AppError {
  constructor(message = 'Produit inexistant') {
    super(message, 400);
    this.name = 'ProductNotFoundError';
  }
}

export class OrderNotFoundError extends AppError {
  constructor(message = 'Commande introuvable') {
    super(message, 404);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderInvalidOrProcessedError extends AppError {
  constructor(message = 'Commande invalide ou déjà traitée') {
    super(message, 400);
    this.name = 'OrderInvalidOrProcessedError';
  }
}

export class SeasonClosedError extends AppError {
  constructor(message = 'La saison est clôturée') {
    super(message, 400);
    this.name = 'SeasonClosedError';
  }
}

export class MemberNotFoundError extends AppError {
  constructor(message = 'Adhérent inexistant') {
    super(message, 400);
    this.name = 'MemberNotFoundError';
  }
}

export class ConcurrentModificationError extends AppError {
  constructor(message = 'Commande déjà traitée (conflit concurrent)') {
    super(message, 409);
    this.name = 'ConcurrentModificationError';
  }
}

export class ShopCategoryNotConfiguredError extends AppError {
  constructor(label?: string) {
    const message = label
      ? `La famille de produit '${label}' n'est pas rattachée à une catégorie comptable.`
      : "Famille de produit non rattachée à une catégorie comptable.";
    super(message, 400);
    this.name = 'ShopCategoryNotConfiguredError';
  }
}

export class MemberNotEligibleError extends AppError {
  constructor(message = "L'adhérent n'est pas éligible pour commander en boutique (statut non validé ou saison incompatible).") {
    super(message, 400);
    this.name = 'MemberNotEligibleError';
  }
}
