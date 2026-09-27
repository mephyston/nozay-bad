import { describe, it, expect, vi } from 'vitest';
import { listPublicOpenPlayRoute } from './route';
import { listPublicOpenPlay } from './handler';

vi.mock('./handler', () => ({
  listPublicOpenPlay: vi.fn().mockResolvedValue({ sessions: [] })
}));

const get = (query: string) => listPublicOpenPlayRoute.request(`/open-play/public${query}`, {}, { DB: {} as any });

describe('listPublicOpenPlayRoute', () => {
  it('transmet au handler une borne et un nombre bien formés', async () => {
    const res = await get('?to=2026-10-04&limit=60');
    expect(res.status).toBe(200);
    expect(listPublicOpenPlay).toHaveBeenLastCalledWith(expect.anything(), { limit: 60, to: '2026-10-04' });
  });

  it('accepte une lecture sans paramètre', async () => {
    expect((await get('')).status).toBe(200);
  });

  it.each(['?to=demain', '?limit=0', '?limit=-3', '?limit=abc'])('refuse une saisie mal formée (%s)', async (query) => {
    const res = await get(query);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/^Validation failed/);
  });
});
