import { describe, it, expect, vi } from 'vitest';
import { updateLedgerEntry } from './handler';
import { UpdateLedgerEntryRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

const spies = vi.hoisted(() => ({
  getById: vi.fn().mockResolvedValue({ id: 1, seasonId: 'season1' }),
  update: vi.fn().mockResolvedValue({ id: 1, seasonId: 'season1' }),
  getMemberById: vi.fn()
}));

vi.mock('./repository', () => {
  return {
    UpdateLedgerEntryRepository: class {
      getById = spies.getById;
      update = spies.update;
    }
  };
});

vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn(),
  getMemberById: spies.getMemberById,
  getMembershipForPersonInSeason: vi.fn().mockResolvedValue(undefined)
}));

describe('updateLedgerEntry', () => {
  const mockSeason = { id: 1, code: 'season1', startDate: '2023-01-01', endDate: '2099-12-31', closedAt: null };
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
      date: '2026-07-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    vi.mocked(membersDataAccess.isSeasonClosed).mockResolvedValue(false);

    const result = await updateLedgerEntry(mockDb, mockId, mockDto);

    expect(result).toEqual({ id: 1, seasonId: 'season1' });
  });

  const body = {
    seasonId: 'season1', type: 'recette' as const, accountId: 'caisse', category: 'cat1',
    amount: 100, date: '2026-07-01', paymentMethod: 'esp', description: 'Cotisation'
  };

  /*
   * Trois formes du champ, trois effets : un nombre rattache, `null` détache, absent laisse
   * l'adhérent en place — un appelant qui ne connaît pas le champ ne doit pas l'effacer.
   */
  it('rattache, détache, ou laisse l’adhérent tel quel selon la forme du champ', async () => {
    spies.getMemberById.mockResolvedValue({ id: 42, seasonId: 1, personId: 7 });
    spies.getById.mockResolvedValue({ id: 1, seasonId: 1, memberId: 9, type: 'recette', status: 'cleared', bankStatementLineId: null });

    spies.update.mockClear();
    await updateLedgerEntry(mockDb, 1, { ...body, memberId: 42 });
    expect(spies.update).toHaveBeenLastCalledWith(mockDb, 1, expect.objectContaining({ memberId: 42 }));

    await updateLedgerEntry(mockDb, 1, { ...body, memberId: null });
    expect(spies.update).toHaveBeenLastCalledWith(mockDb, 1, expect.objectContaining({ memberId: null }));

    await updateLedgerEntry(mockDb, 1, body);
    expect(spies.update.mock.calls.at(-1)?.[2]).not.toHaveProperty('memberId');
  });

  it('refuse de rattacher une adhésion d’un autre exercice', async () => {
    spies.getMemberById.mockResolvedValue({ id: 42, seasonId: 2, personId: 7 });
    spies.getById.mockResolvedValue({ id: 1, seasonId: 1, memberId: null, type: 'recette', status: 'cleared', bankStatementLineId: null });

    await expect(updateLedgerEntry(mockDb, 1, { ...body, memberId: 42 })).rejects.toThrowError(/autre exercice/);
  });

  it('should throw an error if original season is closed', async () => {
    const closedDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ ...mockSeason, closedAt: '2023-12-31' })
          })
        })
      })
    };

    const mockId = 1;
    const mockDto = {
      seasonId: 'season1',
      type: 'recette' as const,
      accountId: 'account1',
      category: 'cat1',
      amount: 100,
      date: '2026-07-01',
      paymentMethod: 'card',
      description: 'Test'
    };

    await expect(updateLedgerEntry(closedDb, mockId, mockDto)).rejects.toThrowError(/clôturé/);
  });
});
