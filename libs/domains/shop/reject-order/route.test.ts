import { describe, it, expect, vi } from 'vitest';
import { rejectOrderRoute } from './route';
import { rejectOrder } from './handler';

vi.mock('./handler', () => ({
  rejectOrder: vi.fn().mockResolvedValue({ id: 1, status: 'rejected' })
}));

describe('rejectOrderRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await rejectOrderRoute.request('/orders/1/reject', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('transmet le motif au handler', async () => {
    const res = await rejectOrderRoute.request(
      '/orders/7/reject',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Doublon' }) },
      { DB: {} as any }
    );
    expect(res.status).toBe(200);
    expect(rejectOrder).toHaveBeenLastCalledWith(expect.anything(), { id: 7, reason: 'Doublon' });
  });

  it('refuse un motif trop long', async () => {
    const res = await rejectOrderRoute.request(
      '/orders/7/reject',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'x'.repeat(501) }) },
      { DB: {} as any }
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await rejectOrderRoute.request('/orders/abc/reject', { method: 'POST' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
