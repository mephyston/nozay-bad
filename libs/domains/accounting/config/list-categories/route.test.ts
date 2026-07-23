import { describe, it, expect, vi } from 'vitest';
import { listCategoriesRoute } from './route';

vi.mock('./handler', () => ({
  listCategories: vi.fn().mockResolvedValue([])
}));

describe('listCategoriesRoute', () => {
  it('handles GET request for categories', async () => {
    const res = await listCategoriesRoute.request('/categories', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
