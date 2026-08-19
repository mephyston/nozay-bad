import { describe, it, expect, vi } from 'vitest';
import { listTransactionsRoute } from './route';

vi.mock('./handler', () => ({
  listLedgerEntries: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 })
}));

describe('listTransactionsRoute', () => {
  it('handles valid query with season and limit', async () => {
    const res = await listTransactionsRoute.request('/ledger-entries?season=25-26&page=1&limit=50', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 when season is missing and unreconciledCheques is not true', async () => {
    const res = await listTransactionsRoute.request('/ledger-entries', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  it('returns 400 for invalid page parameter format', async () => {
    const res = await listTransactionsRoute.request('/ledger-entries?season=25-26&page=abc', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
