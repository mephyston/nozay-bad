import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCategories } from './handler';
import { ListCategoriesRepository } from './repository';


vi.mock('./repository');

describe('listCategories', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      listCategories: vi.fn().mockResolvedValue([])
    };
    (vi.mocked(ListCategoriesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (listCategories as any)(...args);

    // Assert
    
    expect(mockRepoInstance.listCategories).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      listCategories: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ListCategoriesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db];
    await expect((listCategories as any)(...args)).rejects.toThrow();
  });
});
