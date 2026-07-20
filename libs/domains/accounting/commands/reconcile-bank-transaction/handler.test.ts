
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileBankTransaction } from './handler';
import { ReconcileBankTransactionRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
vi.mock('@metacult/features-members-data-access', () => ({ isSeasonClosed: vi.fn() }));
vi.mock('./repository');
vi.mock('@metacult/features-members-api', () => ({ applyPaymentToMember: vi.fn() }));
vi.mock('@metacult/features-accounting-data-access', () => ({ normalizeCategory: vi.fn().mockReturnValue(1) }));
vi.mock('drizzle-orm/sqlite-core', () => ({ SQLiteTransaction: class {} }));

describe('reconcileBankTransaction', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getBankTransactionById: vi.fn().mockResolvedValue({ seasonId: '23-24', amount: 10 }),
      getTransactionById: vi.fn().mockResolvedValue({ seasonId: '23-24', amount: 10, category: 1 }),
      linkTransactionToBank: vi.fn().mockResolvedValue(true),
      getTransactionsForBankTransaction: vi.fn().mockResolvedValue([{ amount: 10 }]),
      markBankTransactionReconciled: vi.fn().mockResolvedValue(true),
    };
    (vi.mocked(ReconcileBankTransactionRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    const payload = { action: 'match', transactionId: 1, memberId: 1 };
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
