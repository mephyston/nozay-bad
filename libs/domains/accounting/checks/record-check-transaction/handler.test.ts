import { describe, it, expect, vi } from 'vitest';
import { createCheck, deleteCheck, analyzeCheckImage } from './handler';
import { AppError } from '@nba/db';

vi.mock('./repository', () => {
  return {
    RecordCheckTransactionRepository: class {
      createTransaction = vi.fn().mockResolvedValue({ id: 10 });
      createCheck = vi.fn().mockResolvedValue({ id: 1, number: '123' });
      getCheckById = vi.fn().mockResolvedValue({ id: 1, ledgerEntryId: 10 });
      getTransactionById = vi.fn().mockResolvedValue({ id: 10, amount: 100, memberId: 1, category: 1 });
      unlinkCheckTransaction = vi.fn();
      deleteTransaction = vi.fn();
      deleteCheck = vi.fn();
      getAllMembers = vi.fn().mockResolvedValue([]);
    }
  };
});

vi.mock('../../shared/helpers', () => ({
  cleanName: vi.fn((s) => s)
}));

vi.mock('@nba/members-api', () => ({
  applyPaymentToMember: vi.fn()
}));

const mockDb = {
  transaction: async (cb: any) => cb(mockDb)
};

describe('record-check-transaction handler', () => {
  it('should create check successfully', async () => {
    const result = await createCheck(mockDb as any, {
      seasonId: '2023',
      number: '123',
      amount: 100,
      emitter: 'TEST'
    });
    expect(result.id).toBe(1);
  });

  it('should throw when creating check without required fields', async () => {
    await expect(createCheck(mockDb as any, { seasonId: '2023' } as any)).rejects.toThrow(AppError);
  });

  it('should delete check successfully', async () => {
    await expect(deleteCheck(mockDb as any, 1)).resolves.toBeUndefined();
  });
});
