import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInvoice } from './handler';
import { CreateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-api';
vi.mock('@metacult/features-members-api', () => ({ isSeasonClosed: vi.fn() }));

vi.mock('./repository');

describe('createInvoice', () => {
  let db: any;

  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });

  it('should execute successfully (nominal case)', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(false);
    
    const mockRepoInstance = {
      generateInvoiceNumber: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(CreateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act
    const args = [db, payload];
    await (createInvoice as any)(...args);

    // Assert
    expect(db.transaction).toHaveBeenCalled();
    expect(mockRepoInstance.create).toHaveBeenCalled();
  });

  it('should throw a business error', async () => {
    // Arrange
    const payload = { seasonId: '23-24', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(true);

    const mockRepoInstance = {
      generateInvoiceNumber: vi.fn().mockRejectedValue(new Error('Business error')),
      create: vi.fn().mockRejectedValue(new Error('Business error'))
    };
    (vi.mocked(CreateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    // Act & Assert
    const args = [db, payload];
    await expect((createInvoice as any)(...args)).rejects.toThrow();
  });

  it('should transform UNIQUE constraint collision into a business error', async () => {
    const payload = { seasonId: '25-26', items: [] } as any;
    (isSeasonClosed as any).mockResolvedValue(false);

    const mockRepoInstance = {
      generateInvoiceNumber: vi.fn().mockResolvedValue('FAC-2526-NBA91-0001'),
      create: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed: invoices.invoice_number'))
    };
    (vi.mocked(CreateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });

    await expect((createInvoice as any)(db, payload)).rejects.toThrow('Numéro de facture déjà attribué, réessayez');
  });
});
