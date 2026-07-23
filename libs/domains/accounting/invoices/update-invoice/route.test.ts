import { describe, it, expect, vi } from 'vitest';
import { updateInvoiceRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';
import { updateInvoice } from './handler';

vi.mock('./handler', () => ({
  updateInvoice: vi.fn(),
}));

describe('UpdateInvoice Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateInvoiceRoute.request('http://localhost/invoices/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '', clientName: 'John' }) // date minLength 1, missing dueDate, missing totalAmount
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateInvoice).mockResolvedValue(undefined);
    
    const validPayload = {
      date: '2026-07-22',
      dueDate: '2026-08-22',
      clientName: 'John Doe',
      totalAmount: 120.50,
      items: [
        { description: 'Item 1', quantity: 2, unitPrice: 60.25 }
      ]
    };

    const res = await updateInvoiceRoute.request('http://localhost/invoices/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validPayload)
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(updateInvoice).toHaveBeenCalledWith(expect.anything(), 123, validPayload);
  });
});
