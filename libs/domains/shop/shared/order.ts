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
/**
 * Pourquoi un adhérent ne peut pas commander, ou `null` s'il le peut.
 *
 * Même règle que l'accès à l'espace adhérent (`membershipGrantsAccess`) : dès qu'un
 * règlement, même partiel, a été reçu. La boutique n'exigeait jusqu'ici qu'une cotisation
 * **soldée** : les adhérents en paiement partiel voyaient la boutique, remplissaient leur
 * commande, et se la voyaient refuser à l'envoi, au nom d'un statut interne
 * (« statut actuel : incomplet ») qui ne leur disait rien. Décidé avec le bureau le
 * 27/09/2026 : seuls ceux qui n'ont rien payé ne commandent pas — et ceux-là n'ont de
 * toute façon pas accès à l'application.
 */
export function motifDeRefusCommande(
  member: { status: string; firstName?: string | null },
  peutCommander: (status: string) => boolean
): string | null {
  if (peutCommander(member.status)) return null;
  const qui = member.firstName ? `${member.firstName}` : "L'adhérent";
  if (member.status === 'suspendu') return `L'adhésion de ${qui} est suspendue : la boutique ne lui est pas ouverte.`;
  return `La cotisation de ${qui} n'a pas encore été réglée : la boutique s'ouvre dès le premier versement.`;
}

export type OrderStatus = 'created' | 'awaiting_payment' | 'paid' | 'rejected' | 'cancelled';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'created',
  'awaiting_payment',
  'paid',
  'rejected',
  'cancelled'
] as const;

/** Longueur maximale du motif de refus : il tient dans une notification et sur une ligne de liste. */
export const REJECTION_REASON_MAX_LENGTH = 500;

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
