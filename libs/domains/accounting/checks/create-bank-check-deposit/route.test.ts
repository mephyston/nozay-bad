import { describe, it, expect, vi } from 'vitest';
import { createBankCheckDepositRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';

vi.mock('./repository', () => {
  return {
    CreateBankCheckDepositRepository: class {
      resolveSeasonId = vi.fn().mockResolvedValue(1);
      getChecksByIds = vi.fn().mockResolvedValue([{ id: 1, amount: 100, number: '123', seasonId: '23-24', status: 'received' }]);
      createCheckDeposit = vi.fn().mockResolvedValue({ id: 2 });
      updateChecksDeposit = vi.fn();
      getCheckDepositById = vi.fn().mockResolvedValue({ id: 2, bankStatementLineId: 3 });
      updateCheckDeposit = vi.fn();
      updateBankStatementLineStatus = vi.fn();
      unlinkChecksForDeposit = vi.fn();
      deleteCheckDeposit = vi.fn();
      buildCreateCheckDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({ meta: { last_row_id: 2 } }) }) });
      buildUpdateChecksDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({}) }) });
      buildUpdateCheckDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({}) }) });
      buildUpdateBankStatementLineStatusStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({}) }) });
    }
  };
});

describe('CreateBankCheckDeposit Route', () => {
  it('should return 400 on invalid body for check-deposits', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createBankCheckDepositRoute.request('http://localhost/check-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '', reference: 'DEP-1', date: '2026-07-22', checkIds: [] })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('should return 200 on valid body for check-deposits', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createBankCheckDepositRoute.request('http://localhost/check-deposits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '23-24', reference: 'DEP-1', date: '2026-07-22', checkIds: [1] })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
  });

  it('should return 400 on invalid body for clear', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createBankCheckDepositRoute.request('http://localhost/check-deposits/2/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankStatementLineId: 'invalid' }) // Should be a number
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
  });

  it('should return 200 on valid body for clear', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createBankCheckDepositRoute.request('http://localhost/check-deposits/2/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankStatementLineId: 3 })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
  });
});
