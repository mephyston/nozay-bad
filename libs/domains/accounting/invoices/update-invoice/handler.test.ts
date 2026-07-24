
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateInvoice } from './handler';
import { UpdateInvoiceRepository } from './repository';
import { isSeasonClosed } from '@nba/members-api';
vi.mock('@nba/members-api', () => ({ isSeasonClosed: vi.fn() }));
vi.mock('./repository');

describe('updateInvoice', () => {
  let db: any;
  beforeEach(() => {
    vi.clearAllMocks();
    db = { batch: vi.fn().mockResolvedValue([]) };
  });
  it('should execute successfully', async () => {
    (isSeasonClosed as any).mockResolvedValue(false);
    const mockRepoInstance = {
      getById: vi.fn().mockResolvedValue({ seasonId: 'season-1', status: 'draft' }),
      buildUpdateStatements: vi.fn().mockReturnValue(['stmt1'])
    };
    (vi.mocked(UpdateInvoiceRepository) as any).mockImplementation(function() { return mockRepoInstance; });
    await (updateInvoice as any)(db, 1, { totalAmount: 10 });
    expect(db.batch).toHaveBeenCalled();
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
