import { describe, it, expect } from 'vitest';
import { toSeasonOptions } from './seasons';

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
