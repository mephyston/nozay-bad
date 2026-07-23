import { describe, it, expect, vi } from 'vitest';
import { deleteCategoryRoute } from './route';

vi.mock('./handler', () => ({
  deleteCategory: vi.fn().mockResolvedValue({ id: 1, name: 'Cat' })
}));

describe('deleteCategoryRoute', () => {
  it('handles valid numeric id param', async () => {
    const res = await deleteCategoryRoute.request('/categories/1', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 for non-numeric id param', async () => {
    const res = await deleteCategoryRoute.request('/categories/abc', { method: 'DELETE' }, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
