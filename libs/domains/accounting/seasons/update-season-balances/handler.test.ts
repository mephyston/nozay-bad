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
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(false);
    
    const mockRepoInstance = {
      updateBalances: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, payload];
    await (updateSeasonBalances as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateBalances).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(true);

    const mockRepoInstance = {
      updateBalances: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(UpdateSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, payload];
    await expect((updateSeasonBalances as any)(...args)).rejects.toThrow();
  });
});
