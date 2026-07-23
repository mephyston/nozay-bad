import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSeason } from './handler';
import { CreateSeasonRepository } from './repository';


vi.mock('./repository');

describe('createSeason', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      deactivateAllSeasonsExcept: vi.fn().mockResolvedValue(true),
      createSeason: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(CreateSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (createSeason as any)(...args);

    // Assert
    
    expect(mockRepoInstance.createSeason).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      deactivateAllSeasonsExcept: vi.fn().mockRejectedValue(new Error('Business error')),
      createSeason: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(CreateSeasonRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((createSeason as any)(...args)).rejects.toThrow();
  });
});
