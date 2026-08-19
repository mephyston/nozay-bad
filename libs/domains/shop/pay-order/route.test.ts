import { describe, it, expect, vi } from 'vitest';
import { payOrderRoute } from './route';

vi.mock('./handler', () => ({
  payOrder: vi.fn().mockResolvedValue({ id: 1, status: 'paid' })
}));

describe('payOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await payOrderRoute.request('/orders/1/pay', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await payOrderRoute.request('/orders/abc/pay', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  it('forwards the payment date when the caller supplies one', async () => {
    const { payOrder } = await import('./handler');
    const res = await payOrderRoute.request(
      '/orders/7/pay',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: '2026-01-15' })
      },
      { DB: {} as any }
    );
    expect(res.status).toBe(200);
    expect(payOrder).toHaveBeenCalledWith(expect.anything(), { id: 7, paidAt: '2026-01-15' });
  });
});
