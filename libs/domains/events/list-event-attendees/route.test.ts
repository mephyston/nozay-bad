import { describe, it, expect, vi } from 'vitest';
import { listEventAttendeesRoute } from './route';

vi.mock('./handler', () => ({
  listEventAttendees: vi.fn().mockResolvedValue({ attendees: [], totals: { members: 0, guests: 0, people: 0 } })
}));

const get = (id: string) => listEventAttendeesRoute.request(`/${id}/attendees`, {}, { DB: {} as any });

describe('listEventAttendeesRoute', () => {
  it('répond pour un identifiant numérique', async () => {
    expect((await get('12')).status).toBe(200);
  });

  it.each(['abc', '0', '-1'])('refuse un identifiant mal formé (%s)', async (id) => {
    const res = await get(id);
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error).toMatch(/^Validation failed/);
  });
});
