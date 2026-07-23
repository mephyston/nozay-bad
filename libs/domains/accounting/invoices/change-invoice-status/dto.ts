import { invoicesTable } from '../../shared/schema';
export type ChangeInvoiceStatusInput = number;
export interface ChangeInvoiceStatusBody { status: 'draft' | 'emise' | 'payee' | 'annulee' }
export type ChangeInvoiceStatusOutput = typeof invoicesTable.$inferSelect;
