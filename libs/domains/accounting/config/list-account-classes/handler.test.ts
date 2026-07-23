import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listAccountClasses } from './handler';
import { ListAccountClassesRepository } from './repository';


vi.mock('./repository');

describe('listAccountClasses', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      listAccountClasses: vi.fn().mockResolvedValue([])
    };
    (vi.mocked(ListAccountClassesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (listAccountClasses as any)(...args);

    // Assert
    
    expect(mockRepoInstance.listAccountClasses).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      listAccountClasses: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ListAccountClassesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db];
    await expect((listAccountClasses as any)(...args)).rejects.toThrow();
  });
});
