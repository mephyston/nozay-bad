import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listSeasons } from './handler';
import { ListSeasonsRepository } from './repository';


vi.mock('./repository');

describe('listSeasons', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      listSeasons: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(ListSeasonsRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (listSeasons as any)(...args);

    // Assert
    
    expect(mockRepoInstance.listSeasons).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      listSeasons: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ListSeasonsRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db];
    await expect((listSeasons as any)(...args)).rejects.toThrow();
  });
});
