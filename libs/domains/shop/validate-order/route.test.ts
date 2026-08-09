import { describe, it, expect, vi } from 'vitest';
import { validateOrderRoute } from './route';

vi.mock('./handler', () => ({
  validateOrder: vi.fn().mockResolvedValue({ id: 1, status: 'awaiting_payment' })
}));

describe('validateOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await validateOrderRoute.request('/orders/1/validate', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('awaiting_payment');
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await validateOrderRoute.request('/orders/abc/validate', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
