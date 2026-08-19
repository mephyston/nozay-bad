import { describe, it, expect, vi } from 'vitest';
import { deleteInvoiceRoute } from './route';

vi.mock('./handler', () => ({
  deleteInvoice: vi.fn().mockResolvedValue(undefined)
}));

describe('deleteInvoiceRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await deleteInvoiceRoute.request('/invoices/1', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await deleteInvoiceRoute.request('/invoices/abc', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
