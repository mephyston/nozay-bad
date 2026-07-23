import { describe, it, expect, vi } from 'vitest';
import { approveOrderRoute } from './route';

vi.mock('./handler', () => ({
  approveOrder: vi.fn().mockResolvedValue({ id: 1, status: 'approved' })
}));

describe('approveOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await approveOrderRoute.request('/orders/1/approve', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await approveOrderRoute.request('/orders/abc/approve', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
