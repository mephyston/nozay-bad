import { describe, it, expect, vi } from 'vitest';
import { getReconciliationStatementRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { getReconciliationStatement } from './handler';
import { AppError } from '@nba/db';

vi.mock('./handler', () => ({
  getReconciliationStatement: vi.fn()
}));

describe('getReconciliationStatement Route', () => {
  it("refuse une requête sans saison", async () => {
    const { mockD1 } = await setupMockDb();
    const res = await getReconciliationStatementRoute.request(
      'http://localhost/accounts/current/reconciliation-statement',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain('Validation failed');
  });

  it('refuse une date malformée', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await getReconciliationStatementRoute.request(
      'http://localhost/accounts/current/reconciliation-statement?season=25-26&date=31/08/2026',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(400);
  });

  it("rend l'état de rapprochement", async () => {
    const { mockD1 } = await setupMockDb();
    const data = { gapCents: 0, reconciled: true };
    vi.mocked(getReconciliationStatement).mockResolvedValue(data as any);

    const res = await getReconciliationStatementRoute.request(
      'http://localhost/accounts/current/reconciliation-statement?season=25-26&date=2026-07-31',
      { method: 'GET' },
      { DB: mockD1 as any }
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual(data);
    expect(getReconciliationStatement).toHaveBeenCalledWith(
      expect.anything(),
      { accountCode: 'current', seasonId: '25-26', date: '2026-07-31' }
    );
  });

  it("propage le code d'un compte introuvable", async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(getReconciliationStatement).mockRejectedValue(new AppError('Compte introuvable.', 404));

    const res = await getReconciliationStatementRoute.request(
      'http://localhost/accounts/livret-b/reconciliation-statement?season=25-26',
      { method: 'GET' },
      { DB: mockD1 as any }
    );

    expect(res.status).toBe(404);
  });

  it('refuse une requête sans liaison de base', async () => {
    const res = await getReconciliationStatementRoute.request(
      'http://localhost/accounts/current/reconciliation-statement?season=25-26',
      { method: 'GET' },
      {} as any
    );
    expect(res.status).toBe(500);
  });
});
