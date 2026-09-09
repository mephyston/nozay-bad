/**
 * Cycle de vie d'une commande boutique.
 *
 * `created` → `awaiting_payment` → `paid`. Seul le passage à `paid` écrit en
 * comptabilité : tant qu'une commande n'est pas réglée, elle n'existe pas pour
 * l'exercice. Les deux issues fermées sont `rejected` (le bureau refuse une
 * demande) et `cancelled` (une commande validée que le règlement n'a jamais suivie).
 *
 * Un seul retour en arrière : `paid` → `awaiting_payment`, quand on a encaissé la
 * mauvaise commande. Il retire la recette du grand livre, tant qu'elle n'y est pas
 * pointée sur le relevé.
 */
export type OrderStatus = 'created' | 'awaiting_payment' | 'paid' | 'rejected' | 'cancelled';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'created',
  'awaiting_payment',
  'paid',
  'rejected',
  'cancelled'
] as const;

/** Statuts d'une commande encore en cours de traitement, réglée ou non. */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = ['created', 'awaiting_payment'] as const;

export interface OrderData {
  id: number;
  seasonId: number;
  memberId: number;
  productId: number;
  quantity: number;
  totalAmountCents: number;
  paymentMethodId: number;
  status: OrderStatus;
  awaitingPaymentSince: string | null;
  ledgerEntryId: number | null;
  createdAt: Date;
}

export class Order {
  constructor(private readonly data: OrderData) {}

  get id(): number {
    return this.data.id;
  }

  get status(): OrderStatus {
    return this.data.status;
  }

  get seasonId(): number {
    return this.data.seasonId;
  }

  get productId(): number {
    return this.data.productId;
  }

  get memberId(): number {
    return this.data.memberId;
  }

  get quantity(): number {
    return this.data.quantity;
  }

  get totalAmountCents(): number {
    return this.data.totalAmountCents;
  }

  get paymentMethodId(): number {
    return this.data.paymentMethodId;
  }

  /** Le bureau accepte la demande : le stock est réservé, le règlement est attendu. */
  canBeValidated(): boolean {
    return this.data.status === 'created';
  }

  /** Le règlement est encaissé : c'est ce passage qui écrit la recette en compta. */
  canBePaid(): boolean {
    return this.data.status === 'awaiting_payment';
  }

  canBeRejected(): boolean {
    return this.data.status === 'created';
  }

  /** Une commande validée puis jamais réglée : le stock réservé est rendu. */
  canBeCancelled(): boolean {
    return this.data.status === 'awaiting_payment';
  }

  /** L'encaissement d'une commande réglée se défait : la recette repart du grand livre. */
  canBeUnpaid(): boolean {
    return this.data.status === 'paid';
  }
}
