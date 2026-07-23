import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInvoice } from './handler';
import { GetInvoiceRepository } from './repository';


vi.mock('./repository');

describe('getInvoice', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    
    
    const mockRepoInstance = {
      getById: vi.fn().mockResolvedValue(true),
      getItemsByInvoiceId: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(GetInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, '1', payload];
    await (getInvoice as any)(...args);

    // Assert
    
    expect(mockRepoInstance.getItemsByInvoiceId).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    

    const mockRepoInstance = {
      getById: vi.fn().mockRejectedValue(new Error('Business error')),
      getItemsByInvoiceId: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(GetInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, '1', payload];
    await expect((getInvoice as any)(...args)).rejects.toThrow();
  });
});
