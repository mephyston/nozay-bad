
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonReports } from './handler';
import { GetSeasonReportsRepository } from './repository';
vi.mock('./repository');

describe('getSeasonReports', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });
  it('should execute successfully', async () => {
    const mockRepoInstance = {
      getTransactions: vi.fn().mockResolvedValue([]),
      getBalances: vi.fn().mockResolvedValue([]),
      getTransactionsForSeason: vi.fn().mockResolvedValue([]),
      getTransactionsForPeriod: vi.fn().mockResolvedValue([]),
      getTransitCategory: vi.fn().mockResolvedValue({ id: 1 })
    };
    (vi.mocked(GetSeasonReportsRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await (getSeasonReports as any)(db, '23-24');
    expect(mockRepoInstance.getTransactionsForSeason).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    const mockRepoInstance = {
      getTransactions: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(GetSeasonReportsRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((getSeasonReports as any)(db, '23-24')).rejects.toThrow();
  });
});
