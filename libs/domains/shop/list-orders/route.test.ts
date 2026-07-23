import { describe, it, expect, vi } from 'vitest';
import { listOrdersRoute } from './route';

vi.mock('./handler', () => ({
  listOrders: vi.fn().mockResolvedValue([])
}));

describe('listOrdersRoute', () => {
  it('handles valid query parameters', async () => {
    const res = await listOrdersRoute.request('/orders?season=25-26&status=pending', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles missing optional query parameters', async () => {
    const res = await listOrdersRoute.request('/orders', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
