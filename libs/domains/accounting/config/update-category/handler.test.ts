import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCategory } from './handler';
import { UpdateCategoryRepository } from './repository';


vi.mock('./repository');

describe('updateCategory', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { adminLabel: 'A' } as any;
    
    
    const mockRepoInstance = {
      updateCategory: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (updateCategory as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateCategory).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { adminLabel: 'A' } as any;
    

    const mockRepoInstance = {
      updateCategory: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(UpdateCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((updateCategory as any)(...args)).rejects.toThrow();
  });
});
