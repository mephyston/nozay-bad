import { describe, it, expect, vi } from 'vitest';
import { updateSeasonBalancesRoute } from './route';
import { setupMockDb } from '@metacult/shared-db/test-utils';
import { updateSeasonBalances } from './handler';

vi.mock('./handler', () => ({
  updateSeasonBalances: vi.fn(),
}));

describe('UpdateSeasonBalances Route', () => {
  it('should return 400 on invalid body', async () => {
    const { mockD1 } = await setupMockDb();
    const res = await updateSeasonBalancesRoute.request('http://localhost/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ accountId: 'invalid_account', initialBalance: 100 }])
    }, { DB: mockD1 as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Validation failed');
  });

  it('should return 200 on valid body', async () => {
    const { mockD1 } = await setupMockDb();
    vi.mocked(updateSeasonBalances).mockResolvedValue(undefined);
    
    const payload = [
      { accountId: 'current' as const, initialBalance: 1500 },
      { accountId: 'savings' as const, initialBalance: 5000 }
    ];

    const res = await updateSeasonBalancesRoute.request('http://localhost/25-26/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { DB: mockD1 as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(updateSeasonBalances).toHaveBeenCalledWith(expect.anything(), '25-26', payload);
  });
});
