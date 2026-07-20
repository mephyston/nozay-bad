
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateInvoice } from './handler';
import { UpdateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@metacult/features-members-data-access';
vi.mock('@metacult/features-members-data-access', () => ({ isSeasonClosed: vi.fn() }));
vi.mock('./repository');

describe('updateInvoice', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getById: vi.fn().mockResolvedValue({ seasonId: 'season-1', status: 'draft' }),
      update: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(UpdateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await (updateInvoice as any)(db, 1, { totalAmount: 10 });
    expect(db.transaction).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    (isSeasonClosed as any).mockResolvedValue(true);
    const mockRepoInstance = {
      getById: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(UpdateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((updateInvoice as any)(db, 1, { totalAmount: 10 })).rejects.toThrow();
  });
});
