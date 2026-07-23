import { invoicesTable } from '../../shared/schema';
export type GetInvoiceInput = number;
export type GetInvoiceOutput = typeof invoicesTable.$inferSelect;
