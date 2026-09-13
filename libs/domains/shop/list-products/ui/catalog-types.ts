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

/**
 * Un moyen de paiement tel que la boutique le propose.
 *
 * La liste vient de la configuration du club (`GET /accounting/payment-methods`,
 * offerts à l'adhérent ou au bureau selon l'écran) : plus aucune liste en dur. `kind`
 * porte le comportement — un virement affiche l'IBAN, des espèces se remettent en main
 * propre — là où le code n'est qu'un identifiant.
 */
export interface PaymentMethodOption {
  value: string;
  label: string;
  kind: 'transfer' | 'cheque' | 'cash' | 'card' | 'voucher' | 'internal';
}

export const categoriesList = [
  { value: 0, label: 'Toutes les catégories' },
  { value: 1, label: 'Volants' },
  { value: 2, label: 'Cordages' },
  { value: 3, label: 'Textile & Accessoires' }
];

/**
 * Ce qu'une commande enregistrée rappelle à son auteur.
 *
 * Figé au moment de l'envoi, et pas dérivé du formulaire : la boîte de confirmation
 * survit à la remise à zéro qu'elle déclenche en se fermant, et doit continuer
 * d'afficher ce qui vient d'être commandé, pas ce qui est de nouveau sélectionné.
 */
export interface OrderConfirmation {
  memberName: string;
  productName: string;
  quantity: number;
  totalCents: number;
  /** Valeur brute (`especes`, `virement`, …), traduite à l'affichage. */
  paymentMethod: string;
  /** Libellé et comportement du moyen choisi, figés avec le récapitulatif. */
  paymentMethodLabel: string;
  paymentMethodKind: OrderPaymentKind | null;
  /**
   * Motif à recopier dans le libellé du virement, ex. « Cordage Yonex BG65 Jean Dupont ».
   *
   * Nom complet, et non le nom masqué affiché à l'écran : c'est le trésorier qui le
   * lit sur le relevé, et « D. Jean » ne lui dit pas qui a payé.
   */
  transferReference: string;
}

/** Un virement ou des espèces ne se règlent pas dans l'application : la confirmation le dit. */
export type OrderPaymentKind = PaymentMethodOption['kind'];
