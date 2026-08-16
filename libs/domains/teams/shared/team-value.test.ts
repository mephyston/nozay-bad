import { describe, it, expect } from 'vitest';
import { computeTeamValue, bestFfbadPoints, formatValue, type LineupEntry } from './team-value';
import { CHAMPIONSHIP_RULES, getDivision } from './championship';
import type { PlayerRanking } from './player';
import type { Ranking } from './ranking';

/** Fabrique un joueur : `s` simple, `d` double, `m` mixte. */
function player(
  licence: string,
  gender: 'H' | 'F',
  rankings: { s?: Ranking | null; d?: Ranking | null; m?: Ranking | null },
  cpph: { s?: number; d?: number; m?: number } = {}
): PlayerRanking {
  return {
    licence,
    lastName: `NOM${licence}`,
    firstName: 'Test',
    gender,
    category: 'Senior',
    mutation: 'none',
    singles: rankings.s ?? null,
    doubles: rankings.d ?? null,
    mixed: rankings.m ?? null,
    cpphSingles: cpph.s ?? null,
    cpphDoubles: cpph.d ?? null,
    cpphMixed: cpph.m ?? null
  };
}

const mixte = CHAMPIONSHIP_RULES.icd_mixte;
const mixteD2 = getDivision('icd_mixte', 'D2')!;

describe("Valeur d'équipe — départemental (art. 6.3.5)", () => {
  /**
   * L'exemple de l'annexe 1 du règlement mixte, repris tel quel. C'est le test qui
   * décide si la formule départementale est juste : s'il passe, le reste suit.
   */
  const annexe: LineupEntry[] = [
    { discipline: 'SH', position: 1, players: [player('1', 'H', { s: 'N3' })] },
    { discipline: 'SH', position: 2, players: [player('2', 'H', { s: 'R4' })] },
    { discipline: 'SH', position: 3, players: [player('3', 'H', { s: 'D7' })] },
    { discipline: 'SD', position: 1, players: [player('4', 'F', { s: 'R6' })] },
    { discipline: 'DH', position: 1, players: [player('5', 'H', { d: 'N2' }), player('6', 'H', { d: 'D7' })] },
    { discipline: 'DD', position: 1, players: [player('7', 'F', { d: 'R6' }), player('8', 'F', { d: 'R6' })] },
    { discipline: 'MX', position: 1, players: [player('9', 'H', { m: 'D8' }), player('10', 'F', { m: 'R5' })] }
  ];

  it("reproduit l'exemple de l'annexe 1 : total 54, valeur 54 / 7 = 7,71", () => {
    const result = computeTeamValue(mixte, mixteD2.format, annexe);

    expect(result.total).toBe(54);
    expect(result.divisor).toBe(7);
    expect(result.value).toBe(54 / 7);
    expect(formatValue(result.value)).toBe('7,71');
    expect(result.incomplete).toBe(false);
  });

  it('évalue chaque ligne comme le règlement : le double est la moyenne de la paire', () => {
    const { lines } = computeTeamValue(mixte, mixteD2.format, annexe);
    const byLabel = Object.fromEntries(lines.map((l) => [l.label, l]));

    expect(byLabel.SH1.points).toBe(10);
    expect(byLabel.SH3.points).toBe(6);
    // Une seule ligne de simple dame dans le format : elle s'appelle « SD », pas « SD1 ».
    expect(byLabel.SD.points).toBe(7);
    expect(byLabel.DH.points).toBe(8.5);
    expect(byLabel.DH.rankings).toBe('N2/D7');
    expect(byLabel.MX.points).toBe(6.5);
  });

  it('divise par le nombre de matchs joués, pas par 7, quand l’équipe est incomplète', () => {
    const incomplete = annexe.slice(0, 6); // 6 lignes sur 7, total 47,5
    const result = computeTeamValue(mixte, mixteD2.format, incomplete);

    expect(result.divisor).toBe(6);
    expect(result.incomplete).toBe(true);
    expect(result.value).toBeCloseTo(47.5 / 6, 4);
  });

  it('refuse de calculer plutôt que de deviner quand un classement manque', () => {
    const withUnranked: LineupEntry[] = [
      ...annexe.slice(1),
      { discipline: 'SH', position: 1, players: [player('99', 'H', { s: null })] }
    ];
    const result = computeTeamValue(mixte, mixteD2.format, withUnranked);

    expect(result.value).toBeNull();
    expect(result.unrankedLicences).toEqual(['99']);
  });

  it('distingue NC, qui vaut 0 point, de l’absence de classement', () => {
    const withNc: LineupEntry[] = [
      ...annexe.slice(1),
      { discipline: 'SH', position: 1, players: [player('99', 'H', { s: 'NC' })] }
    ];
    const result = computeTeamValue(mixte, mixteD2.format, withNc);

    expect(result.unrankedLicences).toEqual([]);
    expect(result.total).toBe(44); // 54 − 10 (le N3 remplacé) + 0
  });
});

describe("Valeur d'équipe — vétérans", () => {
  it("n'en produit aucune : le règlement vétérans n'en définit pas", () => {
    const veterans = CHAMPIONSHIP_RULES.icd_veterans;
    const format = getDivision('icd_veterans', 'D1')!.format;
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [player('1', 'H', { s: 'D9' })] }
    ];

    const result = computeTeamValue(veterans, format, entries);

    expect(result.formula).toBe('none');
    expect(result.value).toBeNull();
    // Les lignes restent calculées : elles servent à l'ordre des paires.
    expect(result.lines[0].points).toBe(4);
  });
});

describe("Valeur d'équipe — régional (art. 5.4.2)", () => {
  const icr = CHAMPIONSHIP_RULES.icr_seniors;
  const formatPn = getDivision('icr_seniors', 'PN')!.format;

  it('retient le meilleur des trois classements de chaque joueur', () => {
    // D9 = 6 en simple, R6 = 18 en double : c'est 18 qui compte.
    expect(bestFfbadPoints(player('1', 'H', { s: 'D9', d: 'R6', m: 'D7' }))).toBe(18);
  });

  it('départage les N1 par la cote, et par la colonne de la discipline', () => {
    // Une dame N1 en double dames : seuil 3500 pour 93 points.
    expect(bestFfbadPoints(player('1', 'F', { d: 'N1' }, { d: 3600 }))).toBe(93);
    expect(bestFfbadPoints(player('2', 'F', { d: 'N1' }, { d: 3300 }))).toBe(84);
    // Le même classement en mixte relève de la colonne SH/DH/MX : 3600 n'y suffit pas.
    expect(bestFfbadPoints(player('3', 'F', { m: 'N1' }, { m: 3600 }))).toBe(75);
    // Cote inconnue : palier plancher, jamais une valeur flatteuse.
    expect(bestFfbadPoints(player('4', 'H', { s: 'N1' }))).toBe(57);
  });

  it('fait la moyenne des 3 meilleurs et des 3 meilleures, divisée par 6', () => {
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [player('h1', 'H', { s: 'N3' })] }, // 39
      { discipline: 'SH', position: 2, players: [player('h2', 'H', { s: 'R4' })] }, // 30
      { discipline: 'SD', position: 1, players: [player('f1', 'F', { s: 'R5' })] }, // 24
      { discipline: 'SD', position: 2, players: [player('f2', 'F', { s: 'R6' })] }, // 18
      { discipline: 'DH', position: 1, players: [player('h1', 'H', { s: 'N3' }), player('h3', 'H', { d: 'D7' })] }, // 12
      { discipline: 'DD', position: 1, players: [player('f1', 'F', { s: 'R5' }), player('f3', 'F', { d: 'D9' })] } // 6
    ];

    const result = computeTeamValue(icr, formatPn, entries);

    // Hommes 39 + 30 + 12 = 81 ; dames 24 + 18 + 6 = 48 ; total 129.
    expect(result.total).toBe(129);
    expect(result.divisor).toBe(6);
    expect(result.value).toBeCloseTo(129 / 6, 4);
  });

  it('compte pour zéro les places non pourvues, sans changer le diviseur', () => {
    const entries: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [player('h1', 'H', { s: 'N3' })] }
    ];
    const result = computeTeamValue(icr, formatPn, entries);

    expect(result.total).toBe(39);
    expect(result.divisor).toBe(6);
    expect(result.value).toBeCloseTo(6.5, 4);
  });

  it('ne compte qu’une fois un joueur aligné sur deux lignes', () => {
    const twice: LineupEntry[] = [
      { discipline: 'SH', position: 1, players: [player('h1', 'H', { s: 'N3' })] },
      { discipline: 'DH', position: 1, players: [player('h1', 'H', { s: 'N3' }), player('h2', 'H', { d: 'D7' })] }
    ];
    const result = computeTeamValue(icr, formatPn, twice);

    expect(result.total).toBe(39 + 12);
  });
});
