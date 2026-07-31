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
      isCategoryUsed: vi.fn().mockResolvedValue(false),
      deleteCategory: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (deleteCategory as any)(...args);

    // Assert
    expect(mockRepoInstance.isCategoryUsed).toHaveBeenCalled();
    expect(mockRepoInstance.deleteCategory).toHaveBeenCalled();
  });

  it('should throw a business error when the category is used in ledger entries', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;

    const mockRepoInstance = {
      isCategoryUsed: vi.fn().mockResolvedValue(true),
      deleteCategory: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert : la garde métier doit empêcher la suppression
    const args = [db, '1', payload];
    await expect((deleteCategory as any)(...args)).rejects.toThrow();
    expect(mockRepoInstance.deleteCategory).not.toHaveBeenCalled();
  });
});
