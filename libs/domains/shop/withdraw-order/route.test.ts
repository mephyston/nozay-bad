import { describe, it, expect, vi } from 'vitest';
import { withdrawOrderRoute } from './route';
import { withdrawOrder } from './handler';

vi.mock('./handler', () => ({
  withdrawOrder: vi.fn().mockResolvedValue({ id: 1, status: 'cancelled' })
}));

const post = (path: string, body?: unknown) =>
  withdrawOrderRoute.request(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) },
    { DB: {} as any }
  );

describe('withdrawOrderRoute', () => {
  it("transmet l'adhérent attendu au handler", async () => {
    const res = await post('/orders/1/withdraw', { memberId: 7 });
    expect(res.status).toBe(200);
    expect(withdrawOrder).toHaveBeenCalledWith(expect.anything(), { id: 1, memberId: 7 });
  });

  it("refuse un appel sans adhérent : la propriété ne se vérifie pas à vide", async () => {
    const res = await post('/orders/1/withdraw', {});
    expect(res.status).toBe(400);
  });

  it('refuse un identifiant non numérique', async () => {
    const res = await post('/orders/abc/withdraw', { memberId: 7 });
    expect(res.status).toBe(400);
  });
});
