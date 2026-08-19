import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listBirthdaysRoute } from './route';
import { getBirthdaysForActiveSeason } from '../shared/queries';

vi.mock('@nba/db', () => ({ createDb: vi.fn(() => ({})) }));
vi.mock('../shared/queries', () => ({ getBirthdaysForActiveSeason: vi.fn().mockResolvedValue([]) }));

const call = () => listBirthdaysRoute.request('/birthdays', {}, { DB: {} as any });

/** Jour civil interrogé, tel que le lit la requête (accesseurs UTC). */
const askedDay = () => {
  const date = vi.mocked(getBirthdaysForActiveSeason).mock.calls.at(-1)![1];
  return date.toISOString().slice(0, 10);
};

describe('listBirthdaysRoute', () => {
  beforeEach(() => vi.mocked(getBirthdaysForActiveSeason).mockClear());
  afterEach(() => vi.useRealTimers());

  it('rend les anniversaires du jour', async () => {
    vi.mocked(getBirthdaysForActiveSeason).mockResolvedValueOnce([
      { firstName: 'Marie', lastName: 'Dupont', age: 34 }
    ]);

    const res = await call();
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data).toEqual([
      { firstName: 'Marie', lastName: 'Dupont', age: 34 }
    ]);
  });

  it('interroge le jour parisien, pas le jour UTC', async () => {
    // 23 h 30 UTC en été : il est déjà 1 h 30 le lendemain à Paris. Sans recalage, un
    // adhérent né le 16 ne serait fêté qu'à 2 h du matin — le bogue que ce test tient.
    vi.setSystemTime(new Date('2026-08-15T23:30:00Z'));
    await call();
    expect(askedDay()).toBe('2026-08-16');

    // Et en journée, les deux calendriers coïncident.
    vi.setSystemTime(new Date('2026-08-15T10:00:00Z'));
    await call();
    expect(askedDay()).toBe('2026-08-15');
  });

  it('refuse de servir sans base', async () => {
    const res = await listBirthdaysRoute.request('/birthdays', {}, {} as any);
    expect(res.status).toBe(500);
  });
});
