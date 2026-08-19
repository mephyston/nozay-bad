import { describe, it, expect, vi } from 'vitest';
import { createCheckDeposit, clearCheckDeposit, deleteCheckDeposit } from './handler';
import { AppError } from '@nba/db';

vi.mock('./repository', () => {
  return {
    CreateBankCheckDepositRepository: class {
      resolveSeasonId = vi.fn().mockResolvedValue(1);
      getChecksByIds = vi.fn().mockResolvedValue([{ id: 1, amount: 100, number: '123', seasonId: '23-24', status: 'pending' }]);
      createCheckDeposit = vi.fn().mockResolvedValue({ id: 2 });
      updateChecksDeposit = vi.fn();
      getCheckDepositById = vi.fn().mockResolvedValue({ id: 2, bankStatementLineId: 3 });
      updateCheckDeposit = vi.fn();
      updateBankStatementLineStatus = vi.fn();
      unlinkChecksForDeposit = vi.fn();
      deleteCheckDeposit = vi.fn();
      buildCreateCheckDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
      buildUpdateChecksDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
      buildUpdateCheckDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
      buildUpdateBankStatementLineStatusStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
      buildUnlinkChecksForDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
      buildDeleteCheckDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (r: any) => r }) });
    }
  };
});

const mockDb = {
  batch: vi.fn().mockResolvedValue([{ meta: { last_row_id: 2 } }])
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
    await expect(clearCheckDeposit(mockDb as any, 2, { bankStatementLineId: 3 })).resolves.toBeUndefined();
  });

  it('should delete deposit', async () => {
    await expect(deleteCheckDeposit(mockDb as any, 2)).resolves.toBeUndefined();
  });
});
