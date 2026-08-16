import { describe, it, expect } from 'vitest';
import { fetchSeasons, currentSeasonCode } from './seasons';

const client = (res: Response | Error) => ({
  fetch: async () => {
    if (res instanceof Error) throw res;
    return res;
  }
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('fetchSeasons', () => {
  it('rend les saisons quand la lecture aboutit', async () => {
    const seasons = [{ code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31' }];

    const result = await fetchSeasons(client(json({ success: true, data: seasons })) as never);

    expect(result.seasons).toEqual(seasons);
    expect(result.errorMsg).toBeNull();
  });

  /**
   * La régression que ce test ferme : sur un refus, la page écrivait la charge utile
   * entière — `{ success: false, error: … }` — dans `seasons`, et le `.find()` suivant
   * échouait en « seasons.find is not a function ». Un rôle à qui l'on accorde les
   * interclubs sans `accounting:seasons:read` passe la garde de page et bute ici : le
   * message doit nommer le droit, pas le type.
   */
  it('nomme le droit manquant sur un refus, et rend un tableau', async () => {
    const result = await fetchSeasons(
      client(json({ success: false, error: 'Accès refusé' }, 403)) as never
    );

    expect(result.seasons).toEqual([]);
    expect(result.errorMsg).toContain('accounting:seasons:read');
  });

  it('rend un tableau vide sur une réponse en erreur', async () => {
    const result = await fetchSeasons(client(json({ success: false }, 500)) as never);

    expect(result.seasons).toEqual([]);
    expect(result.errorMsg).toContain('500');
  });

  it('rend un tableau vide quand `data` n’en est pas un', async () => {
    const result = await fetchSeasons(client(json({ success: true, data: { code: '25-26' } })) as never);

    expect(result.seasons).toEqual([]);
    expect(result.errorMsg).not.toBeNull();
  });

  it('rend un tableau vide quand l’API est injoignable', async () => {
    const result = await fetchSeasons(client(new Error('boom')) as never);

    expect(result.seasons).toEqual([]);
    expect(result.errorMsg).toContain('injoignable');
  });

  it('rend un tableau vide sur une réponse illisible', async () => {
    const result = await fetchSeasons(client(new Response('<html>', { status: 200 })) as never);

    expect(result.seasons).toEqual([]);
    expect(result.errorMsg).toContain('illisible');
  });
});

describe('currentSeasonCode', () => {
  const seasons = [
    { code: '24-25', startDate: '2024-09-01', endDate: '2025-08-31' },
    { code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31' }
  ];

  it('retient la saison qui court à la date du jour', () => {
    expect(currentSeasonCode(seasons, new Date('2026-01-15T12:00:00Z'))).toBe('25-26');
  });

  it('retombe sur la première hors de toute saison', () => {
    expect(currentSeasonCode(seasons, new Date('2030-01-15T12:00:00Z'))).toBe('24-25');
  });

  it('rend une chaîne vide sans saison du tout', () => {
    expect(currentSeasonCode([], new Date('2026-01-15T12:00:00Z'))).toBe('');
  });
});
