import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteAccountClass } from './handler';
import { DeleteAccountClassRepository } from './repository';


vi.mock('./repository');

describe('deleteAccountClass', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      deleteAccountClass: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (deleteAccountClass as any)(...args);

    // Assert
    
    expect(mockRepoInstance.deleteAccountClass).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      deleteAccountClass: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(DeleteAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db];
    await expect((deleteAccountClass as any)(...args)).rejects.toThrow();
  });
});
