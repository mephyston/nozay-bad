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
      // La remise 5 attend d'être déposée, la 2 l'est déjà : chaque route a son cas nominal.
      getCheckDepositById = vi.fn().mockImplementation((_db: any, id: number) => Promise.resolve(
        id === 5
          ? { id: 5, status: 'pending', amountCents: 100, bankStatementLineId: null }
          : { id: 2, status: 'deposited', amountCents: 100, bankStatementLineId: null }
      ));
      getChecksByDepositId = vi.fn().mockResolvedValue([{ id: 1, ledgerEntryId: 10 }]);
      getBankStatementLineById = vi.fn().mockResolvedValue({ id: 3, amountCents: 100, status: 'pending' });
      buildUpdateChecksStatusForDepositStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({}) }) });
      buildPointLedgerEntriesStatement = vi.fn().mockReturnValue({ _prepare: () => ({ getQuery: () => ({ sql: 'SELECT 1', params: [] }), mapResult: (res: any) => res, run: () => Promise.resolve({}) }) });
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

  it('confirme le dépôt sans corps, et refuse une date mal formée', async () => {
    const { mockD1 } = await setupMockDb();
    const sans = await createBankCheckDepositRoute.request('http://localhost/check-deposits/5/deposit', { method: 'POST' }, { DB: mockD1 as any });
    expect(sans.status).toBe(200);

    const mauvaise = await createBankCheckDepositRoute.request('http://localhost/check-deposits/5/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '09/09/2026' })
    }, { DB: mockD1 as any });
    expect(mauvaise.status).toBe(400);
    expect(((await mauvaise.json()) as any).error).toContain('AAAA-MM-JJ');
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
