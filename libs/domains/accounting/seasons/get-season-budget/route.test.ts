import { describe, it, expect, vi } from 'vitest';
import { getSeasonBudgetRoute } from './route';

vi.mock('./handler', () => ({
  getSeasonBudget: vi.fn().mockResolvedValue([])
}));

describe('getSeasonBudgetRoute', () => {
  it('handles valid seasonId param', async () => {
    const res = await getSeasonBudgetRoute.request('/25-26/budget', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty seasonId param', async () => {
    const res = await getSeasonBudgetRoute.request('/%20/budget', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
