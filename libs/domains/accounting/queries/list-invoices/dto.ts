import { invoicesTable } from '../../shared/schema';
export interface ListInvoicesInput { seasonId?: string; status?: 'draft' | 'emise' | 'payee' | 'annulee' }
export type ListInvoicesOutput = (typeof invoicesTable.$inferSelect)[];
