import { describe, it, expect, vi } from 'vitest';
import { rejectOrderRoute } from './route';

vi.mock('./handler', () => ({
  rejectOrder: vi.fn().mockResolvedValue({ id: 1, status: 'rejected' })
}));

describe('rejectOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await rejectOrderRoute.request('/orders/1/reject', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await rejectOrderRoute.request('/orders/abc/reject', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
