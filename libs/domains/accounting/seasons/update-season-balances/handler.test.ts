import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSeasonBalances } from './handler';
import { UpdateSeasonBalancesRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
vi.mock('@nba/members-api', () => ({ isSeasonClosed: vi.fn() }));

vi.mock('./repository');

describe('updateSeasonBalances', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = [{ accountId: 1, initialBalanceCents: 150000 }];
    (isSeasonClosed as any).mockResolvedValue(false);
    
    const mockRepoInstance = {
      resolveSeasonId: vi.fn().mockResolvedValue(1),
      updateBalances: vi.fn().mockResolvedValue(undefined)
    };
    (vi.mocked(UpdateSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    await updateSeasonBalances(db, '25-26', payload);

    // Assert
    expect(mockRepoInstance.resolveSeasonId).toHaveBeenCalledWith(db, '25-26');
    expect(mockRepoInstance.updateBalances).toHaveBeenCalledWith(db, 1, payload);
  });

  it('should throw a business error if season is closed', async () => {
    // Arrange
    const payload = [{ accountId: 1, initialBalanceCents: 150000 }];
    (isSeasonClosed as any).mockResolvedValue(true);

    const mockRepoInstance = {
      resolveSeasonId: vi.fn().mockResolvedValue(1),
      updateBalances: vi.fn()
    };
    (vi.mocked(UpdateSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    await expect(updateSeasonBalances(db, '25-26', payload)).rejects.toThrow('La saison est clôturée');
  });
});

