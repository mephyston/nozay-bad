import { describe, it, expect, vi } from 'vitest';
import { listProductsRoute } from './route';

vi.mock('./handler', () => ({
  listProducts: vi.fn().mockResolvedValue([])
}));

describe('listProductsRoute', () => {
  it('handles valid query params', async () => {
    const res = await listProductsRoute.request('/products?category=badminton&active=true', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('handles missing optional query params', async () => {
    const res = await listProductsRoute.request('/products', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for invalid active param value', async () => {
    const res = await listProductsRoute.request('/products?active=maybe', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
