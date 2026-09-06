import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSeasonBalances } from './handler';
import { GetSeasonBalancesRepository } from './repository';


vi.mock('./repository');

describe('getSeasonBalances', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('rend un solde par compte, identifié par son code et son libellé lus de la base', async () => {
    const mockRepoInstance = {
      getBalances: vi.fn().mockResolvedValue([
        { id: 1, seasonId: 7, accountId: 1, accountCode: 'current', accountLabel: 'Compte Courant', initialBalanceCents: 100000, createdAt: new Date() },
        { id: 2, seasonId: 7, accountId: 4, accountCode: 'badnet', accountLabel: 'Porte-monnaie Badnet', initialBalanceCents: 100000, createdAt: new Date() }
      ])
    };
    (vi.mocked(GetSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    const result = await getSeasonBalances(db, '23-24');

    expect(mockRepoInstance.getBalances).toHaveBeenCalledWith(db, '23-24');
    expect(result).toEqual([
      { seasonId: 7, accountId: 'current', accountNumericId: 1, label: 'Compte Courant', initialBalanceCents: 100000, initialBalance: 100000 },
      { seasonId: 7, accountId: 'badnet', accountNumericId: 4, label: 'Porte-monnaie Badnet', initialBalanceCents: 100000, initialBalance: 100000 }
    ]);
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      getBalances: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(GetSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '23-24'];
    await expect((getSeasonBalances as any)(...args)).rejects.toThrow();
  });
});
