
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonBalance } from './handler';
import { GetSeasonBalanceRepository } from './repository';
vi.mock('./repository');

describe('getSeasonBalance', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });
  it('should execute successfully', async () => {
    const mockRepoInstance = {
      getBalances: vi.fn().mockResolvedValue([]),
      getCashFlowTransactions: vi.fn().mockResolvedValue([]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([])
    };
    (vi.mocked(GetSeasonBalanceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await (getSeasonBalance as any)(db, '23-24');
    expect(mockRepoInstance.getCashFlowTransactions).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    const mockRepoInstance = {
      getBalances: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(GetSeasonBalanceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((getSeasonBalance as any)(db, '23-24')).rejects.toThrow();
  });
});
