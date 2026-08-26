import { describe, it, expect, vi } from 'vitest';
import { listLedgerEntries } from './handler';
import { ListTransactionsRepository } from './repository';

vi.mock('./repository');

describe('listLedgerEntries', () => {
  it('should return paginated transactions', async () => {
    const mockDb = {};
    const mockFilters = { seasonId: 'season1' };
    const mockPagination = { page: 1, limit: 10 };

    vi.mocked(ListTransactionsRepository.prototype.count).mockResolvedValue(25);
    vi.mocked(ListTransactionsRepository.prototype.list).mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const result = await listLedgerEntries(mockDb as any, mockFilters, mockPagination);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(25);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalPages).toBe(3);
  });

  it('transmet le refus du solde progressif au repository', async () => {
    vi.mocked(ListTransactionsRepository.prototype.count).mockResolvedValue(0);
    vi.mocked(ListTransactionsRepository.prototype.list).mockResolvedValue([]);

    await listLedgerEntries({} as any, { seasonId: '25-26' }, { page: 1, limit: 20, runningBalance: false });

    expect(ListTransactionsRepository.prototype.list).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: '25-26' },
      { limit: 20, offset: 0, runningBalance: false }
    );
  });

  it('garde la vue complète quand rien ne la refuse', async () => {
    vi.mocked(ListTransactionsRepository.prototype.count).mockResolvedValue(0);
    vi.mocked(ListTransactionsRepository.prototype.list).mockResolvedValue([]);

    await listLedgerEntries({} as any, { seasonId: '25-26' }, { page: 2, limit: 50 });

    expect(ListTransactionsRepository.prototype.list).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: '25-26' },
      { limit: 50, offset: 50, runningBalance: undefined }
    );
  });
});
