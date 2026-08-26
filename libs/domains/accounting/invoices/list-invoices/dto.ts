import { invoicesTable } from '../../shared/schema';

export interface ListInvoicesInput { seasonId?: string; status?: 'draft' | 'emise' | 'payee' | 'annulee' }

/** L'imputation d'une part de facture ; `categoryId: null` quand la ligne n'en porte pas. */
export interface InvoiceCategoryPart {
  categoryId: number | null;
  amountCents: number;
}

export type ListInvoicesOutput = (typeof invoicesTable.$inferSelect & {
  categoryBreakdown: InvoiceCategoryPart[];
})[];
