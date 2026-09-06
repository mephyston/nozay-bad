import type { OrderStatus } from '../../shared/order';

export type { OrderStatus };

export interface Order {
  id: number;
  seasonId: string;
  memberId: number;
  productId: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: 'virement' | 'cheque' | 'especes' | 'labaz' | 'ancv' | 'pass_sport' | 'ticket_loisir' | 'up_loisir';
  status: OrderStatus;
  awaitingPaymentSince: string | null;
  ledgerEntryId: number | null;
  createdAt: string | Date;
}

/**
 * Vues de la page commandes : tout ce qui est en cours (les deux étapes ouvertes
 * ensemble, la vue par défaut), chaque étape seule, et l'historique.
 */
export type OrdersTab = 'open' | 'created' | 'awaiting_payment' | 'history';

export interface Member {
  id: number;
  firstName: string;
  lastName: string;
  licence: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  category: string;
}

export interface OrderItem {
  order: Order;
  member?: Member;
  product?: Product;
}

export interface Season {
  id: string;
  name: string;
  active: boolean;
  closed?: boolean;
}

export const paymentMethodLabels: Record<string, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  especes: 'Espèces',
  labaz: 'Labaz',
  ancv: 'Chèque ANCV',
  pass_sport: "Pass'Sport",
  ticket_loisir: 'Ticket Loisir',
  up_loisir: 'Up Loisir'
};
