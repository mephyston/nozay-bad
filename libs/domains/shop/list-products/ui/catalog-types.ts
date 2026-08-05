export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
}

export interface Product {
  id: number;
  name: string;
  productCategoryId: number;
  priceCents: number;
  /** Stock restant. Uniquement significatif quand `trackStock` est vrai. */
  stock: number;
  /** Quand c'est faux, le stock n'est pas suivi : l'article reste commandable. */
  trackStock?: boolean;
  active: boolean;
}

/** Un article n'est indisponible que si son stock est suivi et épuisé. */
export function isOutOfStock(product: Pick<Product, 'stock' | 'trackStock'>): boolean {
  return Boolean(product.trackStock) && product.stock <= 0;
}

/** Quantité commandable en une fois (99 max quand le stock n'est pas suivi). */
export function maxOrderableQuantity(product: Pick<Product, 'stock' | 'trackStock'> | null): number {
  if (!product) return 1;
  return product.trackStock ? Math.min(product.stock, 99) : 99;
}

export const paymentMethodsList = [
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'especes', label: 'Espèces' },
  { value: 'labaz', label: 'Labaz' },
  { value: 'ancv', label: 'Chèque ANCV' },
  { value: 'pass_sport', label: "Pass'Sport" },
  { value: 'ticket_loisir', label: 'Ticket Loisir' },
  { value: 'up_loisir', label: 'Up Loisir' }
];

export const categoriesList = [
  { value: 0, label: 'Toutes les catégories' },
  { value: 1, label: 'Volants' },
  { value: 2, label: 'Cordages' },
  { value: 3, label: 'Textile & Accessoires' }
];
