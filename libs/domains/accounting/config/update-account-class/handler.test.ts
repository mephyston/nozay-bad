import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateAccountClass } from './handler';
import { UpdateAccountClassRepository } from './repository';


vi.mock('./repository');

describe('updateAccountClass', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { label: 'A' } as any;
    
    
    const mockRepoInstance = {
      updateAccountClass: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, 'A', { label: 'A' }];
    await (updateAccountClass as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateAccountClass).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { label: 'A' } as any;
    

    const mockRepoInstance = {
      updateAccountClass: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(UpdateAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, 'A', { label: 'A' }];
    await expect((updateAccountClass as any)(...args)).rejects.toThrow();
  });
});
