import { seasonForDate } from './seasons';
import { describe, it, expect } from 'vitest';
import { toSeasonOptions, sortSeasons } from './seasons';

const seasons = [
  { id: 2, code: '26-27', name: 'Saison 2026-2027', startDate: '2026-09-01' },
  { id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', closed: true },
  { id: 3, code: '24-25', name: 'Saison 2024-2025', startDate: '2024-09-01' }
];

describe('toSeasonOptions', () => {
  /* On lit un exercice dans le sens du temps ; l'ordre ne doit pas dépendre de la réponse serveur. */
  it('trie par ordre croissant', () => {
    expect(toSeasonOptions(seasons).map((o) => o.value)).toEqual(['24-25', '25-26', '26-27']);
  });

  it("ne modifie pas la liste qu'on lui passe", () => {
    const input = [...seasons];
    toSeasonOptions(input);
    expect(input.map((s) => s.id)).toEqual([2, 1, 3]);
  });

  /* « (Active) » ne se choisit pas et n'aide pas à choisir : le libellé ne le porte plus. */
  it("n'annonce pas l'exercice actif", () => {
    const labels = toSeasonOptions([{ id: 1, code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01' }] as any).map((o) => o.label);
    expect(labels).toEqual(['Saison 2025-2026']);
  });

  it('signale les exercices clôturés quand on le demande', () => {
    const labels = toSeasonOptions(seasons, { markClosed: true }).map((o) => o.label);
    expect(labels).toContain('Saison 2025-2026 — clôturée');
    expect(labels).toContain('Saison 2026-2027');
  });

  it("rend l'identifiant quand le sélecteur en attend un", () => {
    expect(toSeasonOptions(seasons, { value: 'id' }).map((o) => o.value)).toEqual(['3', '1', '2']);
  });

  /* Toutes les projections ne portent pas `startDate` : le code prend alors le relais. */
  it('trie sur le code faute de date de début', () => {
    const sansDate = [{ id: 2, code: '26-27', name: 'B' }, { id: 1, code: '25-26', name: 'A' }];
    expect(toSeasonOptions(sansDate).map((o) => o.value)).toEqual(['25-26', '26-27']);
  });

  it("retombe sur l'identifiant quand rien d'autre ne nomme la saison", () => {
    expect(toSeasonOptions([{ id: 7 }])).toEqual([{ value: '7', label: 'Saison 7' }]);
  });
});

describe('sortSeasons', () => {
  /* Le pendant de `toSeasonOptions` pour les sélecteurs qui rendent leurs `<option>`
     eux-mêmes : le tri ne doit pas être la contrepartie d'une mise en forme. */
  it('trie par ordre croissant sans toucher à la liste reçue', () => {
    const entree = [...seasons];
    expect(sortSeasons(entree).map((s) => s.code)).toEqual(['24-25', '25-26', '26-27']);
    expect(entree.map((s) => s.id)).toEqual([2, 1, 3]);
  });
});

describe('seasonForDate', () => {
  const seasons = [
    { id: 1, code: '25-26', startDate: '2025-09-01', endDate: '2026-08-31' },
    { id: 2, code: '26-27', startDate: '2026-09-01', endDate: '2027-08-31' }
  ];

  it("rend l'exercice dont les bornes contiennent la date, bornes comprises", () => {
    expect(seasonForDate(seasons, '2026-08-21')?.code).toBe('25-26');
    expect(seasonForDate(seasons, '2026-08-31')?.code).toBe('25-26');
    expect(seasonForDate(seasons, '2026-09-01')?.code).toBe('26-27');
  });

  it("ne trouve rien hors de tout exercice, sans date, ou sur une projection sans bornes", () => {
    expect(seasonForDate(seasons, '2024-01-01')).toBeUndefined();
    expect(seasonForDate(seasons, '')).toBeUndefined();
    expect(seasonForDate([{ id: 1, code: '25-26' }], '2026-01-01')).toBeUndefined();
  });
});
