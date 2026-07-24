import { bankStatementLinesTable } from '../../shared/schema';
export interface ListBankStatementLinesInput { seasonId: string; status?: 'pending' | 'reconciled' | 'ignored'; accountId?: string; filters?: any }
export type ListBankStatementLinesOutput = (typeof bankStatementLinesTable.$inferSelect)[];
