import { describe, it, expect } from 'vitest';
import { fetchSeasons, currentSeasonCode, sortSeasons } from './seasons';

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
    const seasons = [{ code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31' }];

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
    { code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: false },
    { code: '24-25', name: 'Saison 24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: true }
  ];

  /**
   * Le défaut d'un sélecteur est la saison **active** de la configuration, et non celle
   * que les dates désignent : le bureau ouvre parfois la suivante en avance, et deux
   * rubriques affichaient alors deux saisons différentes le même jour.
   */
  it("retient l'active de la configuration, même hors de sa fenêtre de dates", () => {
    expect(currentSeasonCode(seasons, new Date('2026-01-15T12:00:00Z'))).toBe('24-25');
  });

  it('accepte le drapeau tel que D1 le rend, en entier', () => {
    const brut = [
      { code: '24-25', name: 'Saison 24-25', startDate: '2024-09-01', endDate: '2025-08-31', active: 0 },
      { code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31', active: 1 }
    ];
    expect(currentSeasonCode(brut as never, new Date('2024-10-01T12:00:00Z'))).toBe('25-26');
  });

  it("retombe sur la saison qui court quand aucune n'est active", () => {
    const aucune = seasons.map((s) => ({ ...s, active: false }));
    expect(currentSeasonCode(aucune, new Date('2026-01-15T12:00:00Z'))).toBe('25-26');
  });

  /* Le repli de dernier recours est la plus RÉCENTE : trié, c'est la fin du tableau. */
  it('retombe sur la plus récente hors de toute saison', () => {
    const aucune = seasons.map((s) => ({ ...s, active: false }));
    expect(currentSeasonCode(aucune, new Date('2030-01-15T12:00:00Z'))).toBe('25-26');
  });

  it('rend une chaîne vide sans saison du tout', () => {
    expect(currentSeasonCode([], new Date('2026-01-15T12:00:00Z'))).toBe('');
  });
});

describe('sortSeasons', () => {
  /* `/accounting/seasons` répond par identifiant décroissant : sans ce tri, tous les
     sélecteurs proposaient la plus récente en tête. */
  it('ordonne par date de début croissante', () => {
    const rendu = sortSeasons([
      { code: '26-27', startDate: '2026-09-01' },
      { code: '24-25', startDate: '2024-09-01' },
      { code: '25-26', startDate: '2025-09-01' }
    ]);
    expect(rendu.map((s) => s.code)).toEqual(['24-25', '25-26', '26-27']);
  });

  it("ne modifie pas la liste qu'on lui passe", () => {
    const entree = [{ code: '26-27', startDate: '2026-09-01' }, { code: '24-25', startDate: '2024-09-01' }];
    sortSeasons(entree);
    expect(entree.map((s) => s.code)).toEqual(['26-27', '24-25']);
  });

  it('trie sur le code faute de date de début', () => {
    const rendu = sortSeasons([{ code: '26-27' }, { code: '25-26' }]);
    expect(rendu.map((s) => s.code)).toEqual(['25-26', '26-27']);
  });
});
