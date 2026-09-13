import { describe, it, expect } from 'vitest';
import { generateInvoiceRoute } from './route';
import { setupMockDb } from '@nba/db/test-utils';

describe('Generate Invoice Route', () => {
  it('should return 400 on invalid param', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await generateInvoiceRoute.request('http://localhost/invoices/not-a-number/invoice.pdf', {
      method: 'GET'
    }, { DB: mockD1 as any, MEDIA: {} as any });
    expect(res.status).toBe(400);
  });
});
