import { describe, it, expect, vi } from 'vitest';
import { createCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';
import { AppError } from '@nba/db';

vi.mock('./repository', () => {
  return {
    CreateBankCheckDepositRepository: class {
      getChecksByIds = vi.fn().mockResolvedValue([{ id: 1, amount: 100, number: '123', seasonId: '23-24', status: 'pending' }]);
      createCheckDeposit = vi.fn().mockResolvedValue({ id: 2 });
      updateChecksDeposit = vi.fn();
      getCheckDepositById = vi.fn().mockResolvedValue({ id: 2, bankTransactionId: 3 });
      updateCheckDeposit = vi.fn();
      updateBankTransactionStatus = vi.fn();
      unlinkChecksForDeposit = vi.fn();
      deleteCheckDeposit = vi.fn();
    }
  };
});

const mockDb = {
  transaction: async (cb: any) => cb(mockDb)
};

describe('create-bank-check-deposit handler', () => {
  it('should create deposit', async () => {
    const result = await createCheckDeposit(mockDb as any, {
      seasonId: '2023',
      reference: 'REF1',
      date: '2023-01-01',
      checkIds: [1]
    });
    expect(result.id).toBe(2);
  });

  it('should throw when checkIds empty', async () => {
    await expect(createCheckDeposit(mockDb as any, {
      seasonId: '2023',
      reference: 'REF1',
      date: '2023-01-01',
      checkIds: []
    })).rejects.toThrow(AppError);
  });

  it('should clear deposit', async () => {
    await expect(clearCheckDeposit(mockDb as any, 2, { bankTransactionId: 3 })).resolves.toBeUndefined();
  });

  it('should delete deposit', async () => {
    await expect(deleteCheckDeposit(mockDb as any, 2)).resolves.toBeUndefined();
  });
});
