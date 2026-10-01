import type { OrderStatus } from '../../shared/order';

export type { OrderStatus };

export interface Order {
  id: number;
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  totalAmount: number;
  /** Le code d'un moyen de paiement du club : ils sont des données, pas une liste figée. */
  paymentMethod: string;
  status: OrderStatus;
  awaitingPaymentSince: string | null;
  /** Date de remise de l'article, une fois la commande livrée. */
  deliveredAt?: string | null;
  ledgerEntryId: number | null;
  /** Motif d'un refus, quand le bureau en a donné un. */
  rejectionReason?: string | null;
  createdAt: string | Date;
}

/**
 * Vues de la page commandes : tout ce qui est en cours (les trois étapes ouvertes
 * ensemble, la vue par défaut), puis une vue par état du workflow — nouvelle,
 * validée en attente de paiement, payée, livrée —, et les issues refusées ou annulées.
 */
export type OrdersTab = 'open' | 'created' | 'awaiting_payment' | 'paid' | 'delivered' | 'closed';

/** Les vues des commandes closes : elles se rendent dans la table d'historique. */
export const VUES_CLOSES: readonly OrdersTab[] = ['delivered', 'closed'];

export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
  /** Sexe de l'adhérent : sert à vérifier qu'un modèle homme ou femme va à la bonne personne. */
  gender?: 'M' | 'F';
  email?: string | null;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
  /** Le produit parent, pour une déclinaison (une taille de maillot). */
  parentId?: number | null;
  /** « L », « XL »… : déjà accolé au nom par l'API, qui sert « Maillot du club — L ». */
  variantLabel?: string | null;
}

export interface OrderItem {
  order: Order;
  member?: Member;
  product?: Product;
}

/**
 * Une saison telle que le relais la sert.
 *
 * `id` est la clé primaire ; ce n'est **pas** ce qui identifie une saison hors de la
 * base. Ce qui circule dans `?season=`, dans `seasonId` et dans les options de
 * filtrage, c'est le `code` (« 26-27 »). Les confondre laissait le sélecteur de saison
 * vide et, plus grave, faisait échouer la détection de clôture : une saison close
 * proposait encore de valider et d'encaisser.
 */
export interface Season {
  id: number | string;
  /** Le code de saison. Absent des jeux d'essai anciens, où `id` le portait déjà. */
  code?: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

// Les libellés des moyens de paiement viennent de la configuration du club, portés par
// chaque commande (`order.paymentMethodLabel`) : plus de table figée ici.
