import { describe, it, expect, vi } from 'vitest';
import { createLedgerEntry } from './handler';
import { CreateLedgerEntryRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

vi.mock('./repository', () => {
  return {
    CreateLedgerEntryRepository: vi.fn().mockImplementation(() => ({
      create: vi.fn().mockResolvedValue({ id: 1 })
    }))
  };
});

vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn()
}));

describe('createLedgerEntry', () => {
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

  it('should create a transaction successfully', async () => {
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

    const result = await createLedgerEntry(mockDb, mockDto);

    expect(result).toEqual({ id: 1 });
  });

  it('should throw an error if season is closed', async () => {
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

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(true);

    await expect(createLedgerEntry(mockDb, mockDto)).rejects.toThrowError(/La saison est clôturée/);
  });
});
