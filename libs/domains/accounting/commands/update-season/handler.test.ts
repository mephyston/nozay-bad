import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateSeason } from './handler';
import { UpdateSeasonRepository } from './repository';


vi.mock('./repository');

describe('updateSeason', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { active: true } as any;
    
    
    const mockRepoInstance = {
      deactivateAllSeasonsExcept: vi.fn().mockResolvedValue(true),
      updateSeason: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (updateSeason as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateSeason).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { active: true } as any;
    

    const mockRepoInstance = {
      deactivateAllSeasonsExcept: vi.fn().mockRejectedValue(new Error('Business error')),
      updateSeason: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(UpdateSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((updateSeason as any)(...args)).rejects.toThrow();
  });
});
