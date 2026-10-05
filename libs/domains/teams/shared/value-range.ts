import { DISCIPLINE_RANKING, type Discipline, type RankedDiscipline } from './ranking';
import { rankingOf, type PlayerRanking } from './player';
import { cd91Points } from './scales';
import { bestFfbadPoints } from './team-value';
import { assignSeats, type SeatCandidate, type SeatGroup } from './seat-assignment';
import type { ChampionshipRules, MatchSlot } from './championship';

/** Un joueur de l'effectif, avec les disciplines où il est admis ce jour-là. */
export type RangePlayer = PlayerRanking & { eligibleDisciplines: readonly RankedDiscipline[] };

/** La plus faible et la plus forte valeur qu'une équipe peut présenter, à effectif donné. */
export interface ValueRange {
  min: number;
  max: number;
}

/** Les disciplines que chaque genre occupe ; le mixte prend une place de chaque côté. */
const DISCIPLINES_DU_GENRE: Record<'H' | 'F', Discipline[]> = {
  H: ['SH', 'DH', 'MX'],
  F: ['SD', 'DD', 'MX']
};

const SIMPLES = new Set<Discipline>(['SH', 'SD']);

/** Les places d'un genre dans la rencontre : une par simple, une par joueur de double ou de mixte. */
function groupesDuGenre(format: MatchSlot[], genre: 'H' | 'F'): SeatGroup[] {
  return DISCIPLINES_DU_GENRE[genre]
    .map((discipline) => {
      const lignes = format.filter((s) => s.discipline === discipline).length;
      const simple = SIMPLES.has(discipline);
      // Un double de même genre aligne deux joueurs de ce genre ; un mixte, un seul.
      const seats = simple || discipline === 'MX' ? lignes : lignes * 2;
      return { key: discipline, seats, weight: simple ? 1 : 0.5 };
    })
    .filter((g) => g.seats > 0);
}

/** Le joueur peut-il tenir une place de cette discipline ? Admis, et classé dans la discipline. */
const admis = (p: RangePlayer, discipline: Discipline): boolean => {
  const ranked = DISCIPLINE_RANKING[discipline];
  return p.eligibleDisciplines.includes(ranked) && rankingOf(p, ranked) !== null;
};

/**
 * Départemental : chaque place vaut les points du barème CD91 du joueur dans la
 * discipline, la valeur est la somme des lignes divisée par le nombre de matchs.
 */
function plageParLigne(format: MatchSlot[], players: readonly RangePlayer[], maxMatches: number): ValueRange | null {
  let min = 0;
  let max = 0;
  for (const genre of ['H', 'F'] as const) {
    const groupes = groupesDuGenre(format, genre);
    if (groupes.length === 0) continue;
    const candidats: SeatCandidate[] = players
      .filter((p) => p.gender === genre)
      .map((p) => ({
        licence: p.licence,
        points: Object.fromEntries(
          groupes
            .filter((g) => admis(p, g.key as Discipline))
            .map((g) => [g.key, cd91Points(rankingOf(p, DISCIPLINE_RANKING[g.key as Discipline])!)])
        )
      }));
    const bas = assignSeats(candidats, groupes, maxMatches, 'min');
    const haut = assignSeats(candidats, groupes, maxMatches, 'max');
    if (!bas || !haut) return null;
    min += bas.total;
    max += haut.total;
  }
  return { min: min / format.length, max: max / format.length };
}

/** Tous les trios d'une liste (ou moins, si elle compte moins de trois joueurs). */
function trios<T>(items: readonly T[]): T[][] {
  if (items.length <= 3) return [[...items]];
  const out: T[][] = [];
  for (let a = 0; a < items.length; a += 1)
    for (let b = a + 1; b < items.length; b += 1)
      for (let c = b + 1; c < items.length; c += 1) out.push([items[a], items[b], items[c]]);
  return out;
}

/**
 * Régional : la valeur ne regarde pas les lignes mais la feuille — les trois meilleurs
 * joueurs et les trois meilleures joueuses, au meilleur de leurs classements, ÷ 6.
 *
 * Exact, par genre, en parcourant les trios (une douzaine de joueurs : quelques
 * centaines de trios au pire, chacun vérifié par une affectation) :
 * - **plafond** : du trio le plus fort au plus faible, le premier qu'une feuille
 *   complète peut porter. Une feuille plus forte aurait pour trio de tête un trio plus
 *   fort, et porterait déjà ce trio-là ;
 * - **plancher** : du trio le plus faible au plus fort, le premier qui complète la
 *   feuille avec des joueurs **qui ne le dépassent pas** — sinon ils seraient eux-mêmes
 *   dans les trois meilleurs.
 */
function plageRegionale(format: MatchSlot[], players: readonly RangePlayer[], maxMatches: number): ValueRange | null {
  let min = 0;
  let max = 0;
  for (const genre of ['H', 'F'] as const) {
    const groupes = groupesDuGenre(format, genre);
    if (groupes.length === 0) continue;
    const score = new Map<string, number>();
    const candidats: SeatCandidate[] = players
      .filter((p) => p.gender === genre)
      .map((p) => {
        score.set(p.licence, bestFfbadPoints(p));
        const points = Object.fromEntries(groupes.filter((g) => admis(p, g.key as Discipline)).map((g) => [g.key, score.get(p.licence)!]));
        return { licence: p.licence, points };
      })
      .filter((c) => Object.keys(c.points).length > 0);

    const somme = (trio: SeatCandidate[]) => trio.reduce((s, c) => s + score.get(c.licence)!, 0);
    const parSomme = trios(candidats).sort((a, b) => somme(b) - somme(a));
    const porte = (trio: SeatCandidate[], parmi: readonly SeatCandidate[]) =>
      assignSeats(parmi, groupes, maxMatches, 'max', new Set(trio.map((c) => c.licence))) !== null;

    const haut = parSomme.find((trio) => porte(trio, candidats));
    const bas = [...parSomme].reverse().find((trio) => {
      const plafond = Math.min(...trio.map((c) => score.get(c.licence)!));
      const dansLeTrio = new Set(trio.map((c) => c.licence));
      return porte(trio, candidats.filter((c) => dansLeTrio.has(c.licence) || score.get(c.licence)! <= plafond));
    });
    if (!haut || !bas) return null;
    max += somme(haut);
    min += somme(bas);
  }
  return { min: min / 6, max: max / 6 };
}

/**
 * La plage de valeur d'une équipe sur une journée, `null` quand le championnat n'a pas
 * de valeur d'équipe (vétérans) ou que l'effectif ne suffit pas à remplir la rencontre.
 */
export function plageDeValeur(
  rules: Pick<ChampionshipRules, 'valueFormula' | 'maxMatchesPerPlayer'>,
  format: MatchSlot[],
  players: readonly RangePlayer[]
): ValueRange | null {
  if (rules.valueFormula === 'perLine') return plageParLigne(format, players, rules.maxMatchesPerPlayer);
  if (rules.valueFormula === 'best3m3f') return plageRegionale(format, players, rules.maxMatchesPerPlayer);
  return null;
}
