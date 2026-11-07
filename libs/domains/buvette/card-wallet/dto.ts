import type { BuvetteMovementType } from '../shared/schema';

export interface WalletOutput {
  email: string;
  balanceCents: number;
  movements: { id: number; type: BuvetteMovementType; amountCents: number; createdAt: Date }[];
}

export interface QrTokenOutput {
  token: string;
  expiresAt: number;
}
