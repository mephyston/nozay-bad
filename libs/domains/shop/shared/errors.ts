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

export class InsufficientStockError extends AppError {
  constructor(productName?: string) {
    super(
      productName
        ? `Stock insuffisant pour ${productName}.`
        : "Stock insuffisant pour cet article.",
      400
    );
    this.name = 'InsufficientStockError';
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

export class ParentProductNotFoundError extends AppError {
  constructor(message = 'Produit parent inexistant') {
    super(message, 400);
    this.name = 'ParentProductNotFoundError';
  }
}

export class VariantNestingError extends AppError {
  constructor(message = 'Une déclinaison ne peut pas se décliner elle-même : choisissez son produit parent.') {
    super(message, 400);
    this.name = 'VariantNestingError';
  }
}

export class VariantLabelRequiredError extends AppError {
  constructor(message = 'Une déclinaison a besoin d’un libellé (taille, couleur…).') {
    super(message, 400);
    this.name = 'VariantLabelRequiredError';
  }
}

export class ProductHasVariantsError extends AppError {
  constructor(message = 'Ce produit a des déclinaisons : retirez-les d’abord.') {
    super(message, 409);
    this.name = 'ProductHasVariantsError';
  }
}

export class ProductHasOrdersError extends AppError {
  constructor(message = 'Ce produit a été commandé : il ne peut plus être supprimé, désactivez-le plutôt.') {
    super(message, 409);
    this.name = 'ProductHasOrdersError';
  }
}

export class VariantImageError extends AppError {
  constructor(message = 'L’image se dépose sur le produit, pas sur sa déclinaison.') {
    super(message, 400);
    this.name = 'VariantImageError';
  }
}
