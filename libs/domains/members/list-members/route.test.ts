import { describe, it, expect, vi } from 'vitest';
import { listMembersRoute } from './route';

vi.mock('./handler', () => ({
  listMembers: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 })
}));

describe('listMembersRoute', () => {
  it('handles valid query params with search and limit', async () => {
    const res = await listMembersRoute.request('/?page=1&limit=50&search=test&paid=true', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('handles missing optional query params', async () => {
    const res = await listMembersRoute.request('/', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
  });

  it('returns 400 for invalid page param', async () => {
    const res = await listMembersRoute.request('/?page=abc', {}, { DB: {} as any });
    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
  });
});
