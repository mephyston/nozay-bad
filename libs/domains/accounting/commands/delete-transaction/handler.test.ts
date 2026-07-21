import { describe, it, expect, vi } from 'vitest';
import { deleteTransaction } from './handler';
import { DeleteTransactionRepository } from './repository';
import * as membersDataAccess from '@metacult/features-members-api';

vi.mock('./repository');
vi.mock('@metacult/features-members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('deleteTransaction', () => {
  it('should delete a transaction within a db transaction', async () => {
    const mockDb = {
      transaction: vi.fn(async (cb) => cb(mockDb))
    };
    const mockId = 1;

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(false);
    vi.mocked(DeleteTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(DeleteTransactionRepository.prototype.delete).mockResolvedValue();

    await deleteTransaction(mockDb, mockId);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(DeleteTransactionRepository.prototype.delete).toHaveBeenCalledWith(mockDb, mockId);
  });

  it('should throw error if season is closed', async () => {
    const mockDb = {
      transaction: vi.fn(async (cb) => cb(mockDb))
    };
    const mockId = 1;

    vi.mocked(DeleteTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(true);

    await expect(deleteTransaction(mockDb, mockId)).rejects.toThrowError(/La saison est clôturée/);
  });
});
