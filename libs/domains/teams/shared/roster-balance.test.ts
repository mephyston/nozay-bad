import { describe, it, expect } from 'vitest';
import { equilibrer, type BalancePlayer, type BalanceTeam } from './roster-balance';
import type { Ranking } from './ranking';

const joueur = (licence: string, gender: 'H' | 'F', ranking: Ranking | null, teamId: number): BalancePlayer => ({
  licence, lastName: licence, firstName: '', gender, category: 'Senior', mutation: 'none',
  singles: ranking, doubles: ranking, mixed: ranking,
  cpphSingles: null, cpphDoubles: null, cpphMixed: null, teamId
});

const compte = (r: ReturnType<typeof equilibrer>, players: BalancePlayer[], teamId: number, genre: 'H' | 'F') =>
  players.filter((p) => p.gender === genre && r.assignment.get(p.licence) === teamId).length;

describe('equilibrer — mixte', () => {
  const teams: BalanceTeam[] = [
    { id: 1, number: 1, division: 'D2' },
    { id: 2, number: 2, division: 'D3' }
  ];
  // Effectifs à l'envers : l'équipe 1 a les plus faibles, l'équipe 2 les plus forts.
  const rangsH: Ranking[] = ['P12', 'P11', 'P10', 'D9', 'D8', 'D7', 'R6', 'R5'];
  const rangsF: Ranking[] = ['P12', 'P10', 'D8', 'R6'];
  const players = [
    ...rangsH.map((r, i) => joueur(`h${i}`, 'H', r, i < 4 ? 1 : 2)),
    ...rangsF.map((r, i) => joueur(`f${i}`, 'F', r, i < 2 ? 1 : 2))
  ];

  it("remet la plus forte équipe en tête, sans chevauchement quand l'écart le permet", () => {
    const r = equilibrer('icd_mixte', teams, players);
    const [un, deux] = [r.ranges.get(1)!, r.ranges.get(2)!];
    expect(un.min).toBeGreaterThanOrEqual(deux.max);
    expect(r.assignment.get('h7')).toBe(1);
    expect(r.assignment.get('h0')).toBe(2);
  });

  it('garde autant de garçons et autant de filles dans chaque équipe', () => {
    const r = equilibrer('icd_mixte', teams, players);
    expect([compte(r, players, 1, 'H'), compte(r, players, 2, 'H')]).toEqual([4, 4]);
    expect([compte(r, players, 1, 'F'), compte(r, players, 2, 'F')]).toEqual([2, 2]);
    expect(r.quotasRespected).toBe(true);
  });

  it("laisse un joueur figé dans son équipe, et répartit les autres autour de lui", () => {
    // Le plus fort, inscrit en équipe 2, y est figé : il y reste, contre l'intérêt du calcul.
    const r = equilibrer('icd_mixte', teams, players, new Set(['h7']));
    expect(r.assignment.get('h7')).toBe(2);
    expect(r.moves.some((m) => m.licence === 'h7')).toBe(false);
    // Les quotas tiennent toujours : il compte parmi les quatre garçons de l'équipe 2.
    expect([compte(r, players, 1, 'H'), compte(r, players, 2, 'H')]).toEqual([4, 4]);
  });

  it('ne propose aucun mouvement quand la répartition est déjà la meilleure', () => {
    const range = equilibrer('icd_mixte', teams, players);
    const deja = players.map((p) => ({ ...p, teamId: range.assignment.get(p.licence)! }));
    expect(equilibrer('icd_mixte', teams, deja).moves).toEqual([]);
  });
});

describe('equilibrer — plafonds de division', () => {
  // Masculin : la D2 n'admet personne au-dessus de D7 dans la discipline jouée.
  const teams: BalanceTeam[] = [
    { id: 1, number: 1, division: 'D1' },
    { id: 2, number: 2, division: 'D2' }
  ];

  it("ne descend jamais un joueur trop fort pour la division d'en dessous", () => {
    const players = [
      joueur('fort', 'H', 'R5', 2),
      ...(['D8', 'D8', 'D9', 'D9', 'P10', 'P10', 'P11'] as Ranking[]).map((r, i) => joueur(`h${i}`, 'H', r, i < 4 ? 1 : 2))
    ];
    const r = equilibrer('icd_masculin', teams, players);
    expect(r.assignment.get('fort')).toBe(1);
  });

  it("signale le joueur qu'aucune équipe du championnat n'admet", () => {
    const capees: BalanceTeam[] = [{ id: 2, number: 2, division: 'D2' }, { id: 3, number: 3, division: 'D3' }];
    const players = [joueur('trop-fort', 'H', 'N2', 2), ...Array.from({ length: 8 }, (_, i) => joueur(`h${i}`, 'H', 'D9', i < 4 ? 2 : 3))];
    expect(equilibrer('icd_masculin', capees, players).unplaced).toEqual(['trop-fort']);
  });
});

describe('equilibrer — temps de calcul', () => {
  it('répartit un vivier de quatre équipes mixtes en quelques secondes au plus', () => {
    const rangs: Ranking[] = ['P12', 'P11', 'P10', 'D9', 'D8', 'D7', 'R6', 'R5', 'R4'];
    const teams: BalanceTeam[] = [1, 2, 3, 4].map((n) => ({ id: n, number: n, division: n === 1 ? 'D1' : 'D2' }));
    const players = [
      ...Array.from({ length: 20 }, (_, i) => joueur(`h${i}`, 'H', rangs[(i * 7) % rangs.length], (i % 4) + 1)),
      ...Array.from({ length: 14 }, (_, i) => joueur(`f${i}`, 'F', rangs[(i * 5) % rangs.length], (i % 4) + 1))
    ];
    const debut = performance.now();
    const r = equilibrer('icd_mixte', teams, players);
    const duree = performance.now() - debut;
    console.log(`équilibrage de 34 joueurs sur 4 équipes : ${duree.toFixed(0)} ms, score ${r.score.toFixed(3)}, ${r.moves.length} mouvements`);
    expect(duree).toBeLessThan(5000);
    expect([...r.ranges.values()].every((x) => x !== null)).toBe(true);
  });
});
