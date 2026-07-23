import { describe, it, expect, vi } from 'vitest';
import { listSeasonsRoute } from './route';

vi.mock('./handler', () => ({
  listSeasons: vi.fn().mockResolvedValue([])
}));

describe('listSeasonsRoute', () => {
  it('handles GET request for seasons', async () => {
    const res = await listSeasonsRoute.request('/', {}, { DB: {} as any });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
