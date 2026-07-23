import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteCategory } from './handler';
import { DeleteCategoryRepository } from './repository';


vi.mock('./repository');

describe('deleteCategory', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      deleteCategory: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (deleteCategory as any)(...args);

    // Assert
    
    expect(mockRepoInstance.deleteCategory).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      deleteCategory: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(DeleteCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((deleteCategory as any)(...args)).rejects.toThrow();
  });
});
