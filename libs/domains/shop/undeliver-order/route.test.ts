import { describe, it, expect, vi } from 'vitest';
import { undeliverOrderRoute } from './route';

vi.mock('./handler', () => ({
  undeliverOrder: vi.fn().mockResolvedValue({ id: 1, status: 'paid' })
}));

describe('undeliverOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await undeliverOrderRoute.request('/orders/1/undeliver', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('paid');
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await undeliverOrderRoute.request('/orders/abc/undeliver', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
