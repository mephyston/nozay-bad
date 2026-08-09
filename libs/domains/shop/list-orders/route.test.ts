import { describe, it, expect, vi } from 'vitest';
import { listOrdersRoute } from './route';

vi.mock('./handler', () => ({
  listOrders: vi.fn().mockResolvedValue([])
}));

describe('listOrdersRoute', () => {
  it('handles valid query parameters', async () => {
    const res = await listOrdersRoute.request('/orders?season=25-26&status=awaiting_payment', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('rejects an unknown status rather than returning an empty list', async () => {
    const res = await listOrdersRoute.request('/orders?status=pending', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });

  it('handles missing optional query parameters', async () => {
    const res = await listOrdersRoute.request('/orders', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });
});
