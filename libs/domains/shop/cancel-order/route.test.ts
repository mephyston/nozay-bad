import { describe, it, expect, vi } from 'vitest';
import { cancelOrderRoute } from './route';

vi.mock('./handler', () => ({
  cancelOrder: vi.fn().mockResolvedValue({ id: 1, status: 'cancelled' })
}));

describe('cancelOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await cancelOrderRoute.request('/orders/1/cancel', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('cancelled');
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await cancelOrderRoute.request('/orders/abc/cancel', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
