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

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      getBalances: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(GetSeasonBalancesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '23-24'];
    await (getSeasonBalances as any)(...args);

    // Assert
    
    expect(mockRepoInstance.getBalances).toHaveBeenCalled();
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
