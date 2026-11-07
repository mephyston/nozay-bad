import type { BuvetteSale } from '../shared/schema';

export interface CreateSaleInput {
  clientId: string;
  lines: { itemId: number; quantity: number }[];
  rechargeCents?: number;
  rechargeScanToken?: string;
  prepaidScanToken?: string;
  expectedCashCents: number;
  createdByEmail: string;
}

export interface CreateSaleOutput {
  sale: BuvetteSale;
  /** Rejeu d'une vente déjà enregistrée : rien n'a été débité une seconde fois. */
  replayed: boolean;
}
