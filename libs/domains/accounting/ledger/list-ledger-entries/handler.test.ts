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

    const result = await listLedgerEntries(mockDb, mockFilters, mockPagination);

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(25);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.totalPages).toBe(3);
  });
});
