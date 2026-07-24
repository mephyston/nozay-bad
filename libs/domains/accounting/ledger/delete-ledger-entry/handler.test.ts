import { describe, it, expect, vi } from 'vitest';
import { deleteLedgerEntry } from './handler';
import { DeleteTransactionRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

vi.mock('./repository');
vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('deleteLedgerEntry', () => {
  it('should delete a transaction within a db batch', async () => {
    const mockDb = {
      batch: vi.fn().mockResolvedValue([])
    };
    const mockId = 1;

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(false);
    vi.mocked(DeleteTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(DeleteTransactionRepository.prototype.buildDeleteLedgerEntryStatement).mockReturnValue('stmt1' as any);
    vi.mocked(DeleteTransactionRepository.prototype.resetExpenseStatusByTxId).mockResolvedValue();

    await deleteLedgerEntry(mockDb, mockId);

    expect(mockDb.batch).toHaveBeenCalled();
  });

  it('should throw error if season is closed', async () => {
    const mockDb = {
      batch: vi.fn().mockResolvedValue([])
    };
    const mockId = 1;

    vi.mocked(DeleteTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(true);

    await expect(deleteLedgerEntry(mockDb, mockId)).rejects.toThrowError(/La saison est clôturée/);
  });
});
