import { describe, it, expect, vi } from 'vitest';
import { deliverOrderRoute } from './route';

vi.mock('./handler', () => ({
  deliverOrder: vi.fn().mockResolvedValue({ id: 1, status: 'delivered' })
}));

describe('deliverOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await deliverOrderRoute.request('/orders/1/deliver', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('delivered');
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await deliverOrderRoute.request('/orders/abc/deliver', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
