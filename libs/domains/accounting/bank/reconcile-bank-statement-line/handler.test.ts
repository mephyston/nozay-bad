
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileBankStatementLine } from './handler';
import { ReconcileBankStatementLineRepository } from './repository';
import { isSeasonClosed, applyPaymentToMember } from '@nba/members-api';
vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn(),
  applyPaymentToMember: vi.fn(),
  getMemberById: vi.fn().mockResolvedValue({ id: 1 }),
  buildApplyPaymentStatement: vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) })
}));
vi.mock('./repository');
vi.mock('@nba/accounting-api', () => ({ normalizeCategory: vi.fn().mockReturnValue(1) }));


describe('reconcileBankStatementLine', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { batch: vi.fn().mockResolvedValue([]) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankStatementLineById: vi.fn().mockResolvedValue({ id: 1, amount: 10, status: 'pending', date: '2023-01-01', label: 'test' }),
      getTransactionById: vi.fn().mockResolvedValue({ seasonId: '23-24', amount: 10, category: 1 }),
      buildLinkTransactionToBankStatement: vi.fn().mockReturnValue('stmt1'),
      getLedgerEntriesForBankStatementLine: vi.fn().mockResolvedValue([{ amount: 10 }]),
      buildMarkBankStatementLineReconciledStatement: vi.fn().mockReturnValue('stmt2'),
    };
    (vi.mocked(ReconcileBankStatementLineRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const payload = { action: 'match', ledgerEntryId: 1, memberId: 1 };
    await (reconcileBankStatementLine as any)(db, 1, payload);
    expect(db.batch).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankStatementLineById: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(ReconcileBankStatementLineRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((reconcileBankStatementLine as any)(db, 1, {})).rejects.toThrow();
  });
});
