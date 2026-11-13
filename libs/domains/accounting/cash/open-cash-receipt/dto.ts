import type { CashReceiptView } from '../../shared/cash-store';

export interface OpenCashReceiptInput {
  /** Adhésion du payeur ; sinon un payeur extérieur, nommé, avec une adresse facultative. */
  payerMemberId?: number | null;
  payerName?: string;
  payerEmail?: string | null;
  amountCents: number;
  categoryId: number;
  description?: string;
  /** Nom affiché de l'encaisseur, transmis par l'admin qui connaît le compte. */
  collectorName: string;
}

export interface OpenCashReceiptOutput {
  receipt: CashReceiptView;
  /** Contenu du QR code à afficher : il n'est jamais relisible ensuite. */
  qr: string;
  qrExpiresAt: string;
}
