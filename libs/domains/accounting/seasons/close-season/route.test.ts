import { describe, it, expect, vi } from 'vitest';
import { closeSeasonRoute } from './route';

vi.mock('./handler', () => ({
  closeSeason: vi.fn().mockResolvedValue({ id: '25-26', status: 'closed' })
}));

describe('closeSeasonRoute', () => {
  it('handles valid id param', async () => {
    const res = await closeSeasonRoute.request('/25-26/close', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for empty id param', async () => {
    const res = await closeSeasonRoute.request('/%20/close', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
