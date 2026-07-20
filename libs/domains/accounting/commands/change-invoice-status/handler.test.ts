import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeInvoiceStatus } from './handler';
import { ChangeInvoiceStatusRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
vi.mock('@metacult/features-members-data-access', () => ({ isSeasonClosed: vi.fn() }));

vi.mock('./repository');

describe('changeInvoiceStatus', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = {};
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { status: 'draft' } as any;
    (isSeasonClosed as any).mockResolvedValue(false);
    
    const mockRepoInstance = {
      getById: vi.fn().mockResolvedValue(true),
      updateStatus: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(ChangeInvoiceStatusRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, 1, 'draft'];
    await (changeInvoiceStatus as any)(...args);

    // Assert
    
    expect(mockRepoInstance.updateStatus).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { status: 'draft' } as any;
    (isSeasonClosed as any).mockResolvedValue(true);

    const mockRepoInstance = {
      getById: vi.fn().mockRejectedValue(new Error('Business error')),
      updateStatus: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(ChangeInvoiceStatusRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, 1, 'draft'];
    await expect((changeInvoiceStatus as any)(...args)).rejects.toThrow();
  });
});
