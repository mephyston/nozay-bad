
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileBankTransaction } from './handler';
import { ReconcileBankTransactionRepository } from './repository';
import { isSeasonClosed, applyPaymentToMember } from '@nba/members-api';
vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn(),
  applyPaymentToMember: vi.fn()
}));
vi.mock('./repository');
vi.mock('@nba/accounting-api', () => ({ normalizeCategory: vi.fn().mockReturnValue(1) }));


describe('reconcileBankTransaction', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankTransactionById: vi.fn().mockResolvedValue({ id: 1, seasonId: '23-24', amount: 10, status: 'pending', date: '2023-01-01', label: 'test' }),
      getTransactionById: vi.fn().mockResolvedValue({ seasonId: '23-24', amount: 10, category: 1 }),
      linkTransactionToBank: vi.fn().mockResolvedValue(true),
      getTransactionsForBankTransaction: vi.fn().mockResolvedValue([{ amount: 10 }]),
      markBankTransactionReconciled: vi.fn().mockResolvedValue(true),
    };
    (vi.mocked(ReconcileBankTransactionRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const payload = { action: 'match', ledgerEntryId: 1, memberId: 1 };
    await (reconcileBankTransaction as any)(db, 1, payload);
    expect(db.transaction).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankTransactionById: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(ReconcileBankTransactionRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((reconcileBankTransaction as any)(db, 1, {})).rejects.toThrow();
  });
});
