import { describe, it, expect, vi } from 'vitest';
import { getSeasonReportsRoute } from './route';

vi.mock('./handler', () => ({
  getSeasonReports: vi.fn().mockResolvedValue({})
}));

describe('getSeasonReportsRoute', () => {
  it('handles valid seasonId param', async () => {
    const res = await getSeasonReportsRoute.request('/25-26/reports', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty seasonId param', async () => {
    const res = await getSeasonReportsRoute.request('/%20/reports', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
