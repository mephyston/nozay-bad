import type { BuvetteMovementType } from '../shared/schema';

export interface WalletOutput {
  email: string | null;
  balanceCents: number;
  reservedCents: number;
  movements: { id: number; type: BuvetteMovementType; amountCents: number; createdAt: Date }[];
}

export interface MovementDetail {
  id: number;
  type: BuvetteMovementType;
  amountCents: number;
  createdAt: Date;
  lines: { name: string; quantity: number; unitPriceCents: number }[];
  /** Ce qui a complété la carte sur cette vente. */
  cashCents: number;
  cardCents: number;
}

export interface QrTokenOutput {
  token: string;
  /** À saisir à la caisse quand la caméra ne lit pas le QR code. */
  code: string;
  expiresAt: number;
}
