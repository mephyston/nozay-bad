import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAccountClass } from './handler';
import { CreateAccountClassRepository } from './repository';


vi.mock('./repository');

describe('createAccountClass', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { code: 'A', label: 'B' } as any;
    
    
    const mockRepoInstance = {
      createAccountClass: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(CreateAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, payload];
    await (createAccountClass as any)(...args);

    // Assert
    
    expect(mockRepoInstance.createAccountClass).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { code: 'A', label: 'B' } as any;
    

    const mockRepoInstance = {
      createAccountClass: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(CreateAccountClassRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, payload];
    await expect((createAccountClass as any)(...args)).rejects.toThrow();
  });
});
