import { describe, it, expect, vi } from 'vitest';
import { deleteTransactionRoute } from './route';

vi.mock('./handler', () => ({
  deleteLedgerEntry: vi.fn().mockResolvedValue(undefined)
}));

describe('deleteTransactionRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await deleteTransactionRoute.request('/ledger/1', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await deleteTransactionRoute.request('/ledger/abc', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
