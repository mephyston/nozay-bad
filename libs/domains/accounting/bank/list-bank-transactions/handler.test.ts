import { describe, it, expect, vi } from 'vitest';
import { listBankTransactions } from './handler';

describe('listBankTransactions', () => {
  it('should list transactions for a season', async () => {
    const dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue([{ id: 1, name: 'Tx 1' }]),
    };

    const result = await listBankTransactions(dbMock, { seasonId: '2024-2025' });
    expect(result).toHaveLength(1);
    expect(dbMock.select).toHaveBeenCalled();
  });
});
