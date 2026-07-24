import { describe, it, expect, vi } from 'vitest';
import { getSeasonBalancesRoute } from './route';

vi.mock('./handler', () => ({
  getSeasonBalances: vi.fn().mockResolvedValue([])
}));

describe('getSeasonBalancesRoute', () => {
  it('handles valid seasonId param', async () => {
    const res = await getSeasonBalancesRoute.request('/25-26/balances', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty seasonId param', async () => {
    const res = await getSeasonBalancesRoute.request('/%20/balances', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
