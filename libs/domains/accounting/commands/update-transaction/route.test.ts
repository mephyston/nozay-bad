import { describe, it, expect, vi } from 'vitest';
import { updateTransactionRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { updateTransaction } from './handler';

vi.mock('./handler', () => ({
  updateTransaction: vi.fn(),
}));

describe('UpdateTransaction Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateTransactionRoute.request('http://localhost/transactions/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seasonId: '', type: 'invalid_type', accountId: 'current' })
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    const expectedData = { id: 123, amount: 50 };
    vi.mocked(updateTransaction).mockResolvedValue(expectedData);
    
    const payload = {
      seasonId: '25-26',
      type: 'recette' as const,
      accountId: 'current' as const,
      amount: 50,
      date: '2026-07-22',
      paymentMethod: 'virement',
      description: 'test update'
    };

    const res = await updateTransactionRoute.request('http://localhost/transactions/123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(expectedData);
    expect(updateTransaction).toHaveBeenCalledWith(expect.anything(), 123, payload);
  });
});
