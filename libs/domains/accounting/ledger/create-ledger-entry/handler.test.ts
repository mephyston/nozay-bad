import { describe, it, expect, vi } from 'vitest';
import { createLedgerEntry } from './handler';
import { CreateLedgerEntryRepository } from './repository';
import * as membersDataAccess from '@nba/members-api';

const spies = vi.hoisted(() => ({
  create: vi.fn().mockResolvedValue({ id: 1 }),
  getMemberById: vi.fn()
}));

vi.mock('./repository', () => {
  return {
    CreateLedgerEntryRepository: class {
      resolveSeasonId = vi.fn().mockResolvedValue(1);
      create = spies.create;
    }
  };
});

vi.mock('@nba/members-api', () => ({
  isSeasonClosed: vi.fn(),
  getMemberById: spies.getMemberById,
  getMembershipForPersonInSeason: vi.fn().mockResolvedValue(undefined)
}));

describe('createLedgerEntry', () => {
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

  it('should create a transaction successfully', async () => {
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

    const result = await createLedgerEntry(mockDb, mockDto);

    expect(result).toEqual({ id: 1 });
  });

  /*
   * L'adhérent d'une recette en espèces ou en bons : c'est la seule façon qu'elle compte pour
   * son dossier. Rattaché à l'exercice de l'écriture, il est écrit ; d'un autre, refusé.
   */
  it('écrit l’adhésion rattachée quand elle relève de l’exercice', async () => {
    spies.getMemberById.mockResolvedValue({ id: 42, seasonId: 1, personId: 7 });
    spies.create.mockClear();

    await createLedgerEntry(mockDb, {
      seasonId: 'season1', type: 'recette', accountId: 'caisse', category: 'cat1',
      amount: 100, date: '2026-07-01', paymentMethod: 'esp', description: 'Cotisation', memberId: 42
    });

    expect(spies.create).toHaveBeenCalledWith(mockDb, expect.objectContaining({ memberId: 42 }));
  });

  it('refuse une adhésion d’un autre exercice', async () => {
    spies.getMemberById.mockResolvedValue({ id: 42, seasonId: 2, personId: 7 });

    await expect(
      createLedgerEntry(mockDb, {
        seasonId: 'season1', type: 'recette', accountId: 'caisse', category: 'cat1',
        amount: 100, date: '2026-07-01', paymentMethod: 'esp', description: 'Cotisation', memberId: 42
      })
    ).rejects.toThrowError(/autre exercice/);
  });

  it('should throw an error if season is closed', async () => {
    const closedDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ ...mockSeason, closedAt: '2023-12-31' })
          })
        })
      })
    };

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

    await expect(createLedgerEntry(closedDb, mockDto)).rejects.toThrowError(/clôturé/);
  });
});
