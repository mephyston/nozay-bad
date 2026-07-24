import { describe, it, expect, vi } from 'vitest';
import { getSeasonBalanceRoute } from './route';

vi.mock('./handler', () => ({
  getSeasonBalance: vi.fn().mockResolvedValue({ totalRevenue: 100, totalExpenses: 50 })
}));

describe('getSeasonBalanceRoute', () => {
  it('handles valid seasonId param', async () => {
    const res = await getSeasonBalanceRoute.request('/25-26/balance', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty seasonId param', async () => {
    const res = await getSeasonBalanceRoute.request('/%20/balance', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
