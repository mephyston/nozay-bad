import { describe, it, expect, vi } from 'vitest';
import { listInvoicesRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { listInvoices } from './handler';

vi.mock('./handler', () => ({
  listInvoices: vi.fn(),
}));

describe('listInvoices Route', () => {
  it('should return 400 when season is missing', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await listInvoicesRoute.request(
      'http://localhost/invoices',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid query parameters', async () => {
    const { mockD1 } = await setupMockDb();
    const mockData = [{ id: 1, invoiceNumber: 'INV-001' }];
    vi.mocked(listInvoices).mockResolvedValue(mockData as any);

    const res = await listInvoicesRoute.request(
      'http://localhost/invoices?season=2024-2025',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockData);
    expect(listInvoices).toHaveBeenCalledWith(expect.anything(), '2024-2025');
  });
});
