import { bankStatementLinesTable } from '../../shared/schema';
export interface ListBankTransactionsInput { seasonId: string; status?: 'pending' | 'reconciled' | 'ignored'; accountId?: string }
export type ListBankTransactionsOutput = (typeof bankStatementLinesTable.$inferSelect)[];
