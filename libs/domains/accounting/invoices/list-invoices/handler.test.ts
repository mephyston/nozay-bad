import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listInvoices } from './handler';
import { ListInvoicesRepository } from './repository';


vi.mock('./repository');

describe('listInvoices', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      list: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(ListInvoicesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db];
    await (listInvoices as any)(...args);

    // Assert
    
    expect(mockRepoInstance.list).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      list: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ListInvoicesRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db];
    await expect((listInvoices as any)(...args)).rejects.toThrow();
  });
});
