import { describe, it, expect, vi } from 'vitest';
import { changeInvoiceStatusRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { changeInvoiceStatus } from './handler';

vi.mock('./handler', () => ({
  changeInvoiceStatus: vi.fn(),
}));

describe('ChangeInvoiceStatus Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await changeInvoiceStatusRoute.request('http://localhost/invoices/123/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Statut invalide');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(changeInvoiceStatus).mockResolvedValue(undefined);
    
    const res = await changeInvoiceStatusRoute.request('http://localhost/invoices/123/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(changeInvoiceStatus).toHaveBeenCalledWith(expect.anything(), 123, 'sent');
  });
});
