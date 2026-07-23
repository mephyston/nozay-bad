import { describe, it, expect, vi } from 'vitest';
import { getInvoiceRoute } from './route';

vi.mock('./handler', () => ({
  getInvoice: vi.fn().mockResolvedValue({ id: 1, invoiceNumber: 'FAC-25-26-0001' })
}));

describe('getInvoiceRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await getInvoiceRoute.request('/invoices/1', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await getInvoiceRoute.request('/invoices/abc', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
