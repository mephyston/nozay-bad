import { describe, it, expect, vi } from 'vitest';
import { unpayOrderRoute } from './route';

vi.mock('./handler', () => ({
  unpayOrder: vi.fn().mockResolvedValue({ id: 1, status: 'awaiting_payment' })
}));

describe('unpayOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await unpayOrderRoute.request('/orders/1/unpay', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('awaiting_payment');
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await unpayOrderRoute.request('/orders/abc/unpay', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
