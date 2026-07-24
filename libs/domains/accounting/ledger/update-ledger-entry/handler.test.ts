import { describe, it, expect, vi } from 'vitest';
import { updateLedgerEntry } from './handler';
import { UpdateLedgerEntryRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('updateLedgerEntry', () => {
  const mockSeason = { id: 1, code: 'season1', startDate: '2023-01-01', endDate: '2023-12-31', closedAt: null };
  const mockDb: any = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(mockSeason)
        })
      })
    })
  };

  it('should update a transaction successfully', async () => {
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
    vi.spyOn(UpdateLedgerEntryRepository.prototype, 'getById').mockResolvedValue({ id: 1, seasonId: 'season1' } as any);
    vi.spyOn(UpdateLedgerEntryRepository.prototype, 'update').mockResolvedValue({ id: 1, seasonId: 'season1' } as any);

    const result = await updateLedgerEntry(mockDb, mockId, mockDto);

    expect(result).toEqual({ id: 1, seasonId: 'season1' });
    expect(UpdateLedgerEntryRepository.prototype.update).toHaveBeenCalled();
  });

  it('should throw an error if original season is closed', async () => {
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

    vi.spyOn(UpdateLedgerEntryRepository.prototype, 'getById').mockResolvedValue({ id: 1, seasonId: 'season1' } as any);
    vi.mocked(membersDataAccess.isSeasonClosed).mockImplementation(async (_db, seasonId) => seasonId === 'season1');

    await expect(updateLedgerEntry(mockDb, mockId, mockDto)).rejects.toThrowError(/La saison d'origine est clôturée/);
  });
});
