import { describe, it, expect, vi, beforeEach } from 'vitest';
import { closeSeason } from './handler';
import { CloseSeasonRepository } from './repository';


vi.mock('./repository');

describe('closeSeason', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      updateSeason: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(CloseSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (closeSeason as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateSeason).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      updateSeason: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(CloseSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((closeSeason as any)(...args)).rejects.toThrow();
  });
});
