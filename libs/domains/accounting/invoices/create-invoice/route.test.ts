import { describe, it, expect, vi } from 'vitest';
import { createInvoiceRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { createInvoice } from './handler';

vi.mock('./handler', () => ({
  createInvoice: vi.fn(),
}));

describe('CreateInvoice Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await createInvoiceRoute.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '', // Invalid
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Test Client',
        totalAmount: 100
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createInvoice).mockResolvedValue({ id: 1 } as any);

    const res = await createInvoiceRoute.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Test Client',
        totalAmount: 100,
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 50 }
        ]
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1 });
  });

  it('should return 400 when handler throws an error', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(createInvoice).mockRejectedValue(new Error('Saison clôturée'));

    const res = await createInvoiceRoute.request('http://localhost/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: '25-26',
        date: '2026-07-22',
        dueDate: '2026-08-22',
        clientName: 'Test Client',
        totalAmount: 100
      })
    }, { DB: mockD1 as any });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error).toBe('Saison clôturée');
  });
});
