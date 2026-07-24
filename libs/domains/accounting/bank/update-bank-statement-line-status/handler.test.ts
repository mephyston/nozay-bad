import { describe, it, expect, vi } from 'vitest';
import { updateBankStatementLineStatus } from './handler';

describe('updateBankStatementLineStatus', () => {
  it('should update status successfully', async () => {
    const dbMock = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue(true),
    };

    await updateBankStatementLineStatus(dbMock, { id: 1, status: 'ignored' });
    expect(dbMock.update).toHaveBeenCalled();
  });

  it('should throw an error if id is missing', async () => {
    const dbMock = {};
    await expect(updateBankStatementLineStatus(dbMock, { id: 0, status: 'ignored' })).rejects.toThrow('Transaction ID is required');
  });

  it('should throw an error if status is invalid', async () => {
    const dbMock = {};
    await expect(updateBankStatementLineStatus(dbMock, { id: 1, status: 'invalid' as any })).rejects.toThrow('Invalid status');
  });
});
