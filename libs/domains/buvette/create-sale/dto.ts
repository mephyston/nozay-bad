import type { BuvetteSale } from '../shared/schema';

export interface CreateSaleInput {
  clientId: string;
  lines: { itemId: number; quantity: number }[];
  rechargeCents?: number;
  rechargeScanToken?: string;
  prepaidScanToken?: string;
  orderId?: number;
  expectedOrderCents?: number;
  /** Le reste annoncé à l'écran, en espèces ou en CB selon `payRestByCard`. */
  expectedCashCents: number;
  payRestByCard?: boolean;
  createdByEmail: string;
}

export interface CreateSaleOutput {
  sale: BuvetteSale;
  /** Rejeu d'une vente déjà enregistrée : rien n'a été débité une seconde fois. */
  replayed: boolean;
  /** La tentative à lancer, si le reste part en CB. */
  attempt?: { foreignTxId: string; amountCents: number };
}
