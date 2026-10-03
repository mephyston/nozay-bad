import { describe, it, expect, vi } from 'vitest';
import { amendOrderRoute } from './route';
import { amendOrder } from './handler';

vi.mock('./handler', () => ({
  amendOrder: vi.fn().mockResolvedValue({ id: 1, status: 'created' })
}));

const put = (path: string, body: unknown) =>
  amendOrderRoute.request(
    path,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    { DB: {} as any }
  );

describe('amendOrderRoute', () => {
  it('transmet la modification et le propriétaire attendu', async () => {
    const body = { memberId: 7, productId: 3, quantity: 2, paymentMethod: 'cheque' };
    const res = await put('/orders/1/amend', body);
    expect(res.status).toBe(200);
    expect(amendOrder).toHaveBeenCalledWith(expect.anything(), 1, body);
  });

  it('refuse une modification sans adhérent', async () => {
    const res = await put('/orders/1/amend', { productId: 3, quantity: 2, paymentMethod: 'cheque' });
    expect(res.status).toBe(400);
  });
});
