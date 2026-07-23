
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteInvoice } from './handler';
import { DeleteInvoiceRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
vi.mock('@nba/members-api', () => ({ isSeasonClosed: vi.fn() }));
vi.mock('./repository');

describe('deleteInvoice', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { transaction: vi.fn(async (cb) => cb(db)) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getById: vi.fn().mockResolvedValue({ seasonId: 'season-1', status: 'draft' }),
      delete: vi.fn().mockResolvedValue(true)
    };
    (vi.mocked(DeleteInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await (deleteInvoice as any)(db, 1);
    expect(db.transaction).toHaveBeenCalled();
  });
  it('should throw error', async () => {
    (isSeasonClosed as any).mockResolvedValue(true);
    const mockRepoInstance = {
      getById: vi.fn().mockRejectedValue(new Error('err')),
    };
    (vi.mocked(DeleteInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await expect((deleteInvoice as any)(db, 1)).rejects.toThrow();
  });
});
