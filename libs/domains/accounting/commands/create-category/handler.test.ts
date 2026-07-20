import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCategory } from './handler';
import { CreateCategoryRepository } from './repository';


vi.mock('./repository');

describe('createCategory', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      createCategory: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(CreateCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, payload];
    await (createCategory as any)(...args);

    // Assert
    
    expect(mockRepoInstance.createCategory).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      createCategory: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(CreateCategoryRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, payload];
    await expect((createCategory as any)(...args)).rejects.toThrow();
  });
});
