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
      isAccountClassUsed: vi.fn().mockResolvedValue(false),
      deleteAccountClass: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (deleteAccountClass as any)(...args);

    // Assert
    expect(mockRepoInstance.isAccountClassUsed).toHaveBeenCalled();
    expect(mockRepoInstance.deleteAccountClass).toHaveBeenCalled();
  });

  it('should throw a business error when the account class is in use', async () => {
    // Arrange
    const mockRepoInstance = {
      isAccountClassUsed: vi.fn().mockResolvedValue(true),
      deleteAccountClass: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert : la garde métier doit empêcher la suppression
    const args = [db];
    await expect((deleteAccountClass as any)(...args)).rejects.toThrow();
    expect(mockRepoInstance.deleteAccountClass).not.toHaveBeenCalled();
  });
});
