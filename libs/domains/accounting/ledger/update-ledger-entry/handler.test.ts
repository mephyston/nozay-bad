import { describe, it, expect, vi } from 'vitest';
import { updateLedgerEntry } from './handler';
import { UpdateTransactionRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

vi.mock('./repository');
vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('updateLedgerEntry', () => {
  it('should update a transaction successfully', async () => {
    const mockDb = {};
    const mockId = 1;
    const mockDto = {
      seasonId: 'season1',
      type: 'recette' as const,
      accountId: 'account1',
      category: 'cat1',
      amount: 100,
      date: '2023-01-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(false);
    vi.mocked(UpdateTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(UpdateTransactionRepository.prototype.update).mockResolvedValue({ id: 1, seasonId: 'season1' });

    const result = await updateLedgerEntry(mockDb, mockId, mockDto);

    expect(result).toEqual({ id: 1, seasonId: 'season1' });
    expect(UpdateTransactionRepository.prototype.update).toHaveBeenCalled();
  });

  it('should throw an error if original season is closed', async () => {
    const mockDb = {};
    const mockId = 1;
    const mockDto = {
      seasonId: 'season2',
      type: 'recette' as const,
      accountId: 'account1',
      category: 'cat1',
      amount: 100,
      date: '2023-01-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    vi.mocked(UpdateTransactionRepository.prototype.getById).mockResolvedValue({ id: 1, seasonId: 'season1' });
    vi.mocked(membersDataAccess.isSeasonClosed).mockImplementation(async (_db, seasonId) => seasonId === 'season1');

    await expect(updateLedgerEntry(mockDb, mockId, mockDto)).rejects.toThrowError(/La saison d'origine est clôturée/);
  });
});
