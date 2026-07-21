import { describe, it, expect, vi } from 'vitest';
import { listBankTransactionsRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { listBankTransactions } from './handler';

vi.mock('./handler', () => ({
  listBankTransactions: vi.fn(),
}));

describe('listBankTransactions Route', () => {
  it('should return 400 when season is missing or empty', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await listBankTransactionsRoute.request(
      'http://localhost/bank-transactions',
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
    const mockData = [{ id: 1, amount: 100 }];
    vi.mocked(listBankTransactions).mockResolvedValue(mockData as any);

    const res = await listBankTransactionsRoute.request(
      'http://localhost/bank-transactions?season=2024-2025&status=reconciled&accountId=abc',
      { method: 'GET' },
      { DB: mockD1 as any }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual(mockData);
    expect(listBankTransactions).toHaveBeenCalledWith(
      expect.anything(),
      { seasonId: '2024-2025', filters: { status: 'reconciled', accountId: 'abc' } }
    );
  });
});
