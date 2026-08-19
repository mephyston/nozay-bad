/**
 * Valeur d'une équipe pour une rencontre.
 *
 * Deux formules, qui ne se ressemblent pas :
 *
 * - **Départemental** (`perLine`) — on value chaque ligne de la rencontre, on additionne,
 *   on divise par le nombre de matchs. Un double vaut la moyenne de ses deux joueurs.
 * - **Régional** (`best3m3f`) — on ignore les lignes : on prend les 3 meilleurs joueurs et
 *   les 3 meilleures joueuses de la feuille, au meilleur de leurs trois classements, et
 *   on divise par 6. Les manquants comptent pour zéro.
 *
 * Les vétérans n'ont pas de formule : leur règlement n'évalue que les doubles, pour
 * l'ordre des paires. On calcule quand même les lignes — elles s'affichent — mais aucune
 * valeur d'équipe n'en sort, et donc aucune contrainte de hiérarchie.
 */

import { DISCIPLINE_RANKING, isDouble, type Discipline, type Ranking } from './ranking';
import { rankingOf, cpphOf, type PlayerRanking } from './player';
import { cd91Points, ffbadPoints } from './scales';
import { RANKED_DISCIPLINES } from './ranking';
import type { ChampionshipRules, MatchSlot } from './championship';

/** Une ligne composée : un joueur en simple, deux en double. */
export interface LineupEntry {
  discipline: Discipline;
  position: number;
  players: PlayerRanking[];
}

export interface LineValue {
  discipline: Discipline;
  position: number;
  /** « SH1 », ou « SD » quand la rencontre n'en compte qu'un. */
  label: string;
  /** « N2/D7 » — les classements lus, dans l'ordre des joueurs. */
  rankings: string;
  /** `null` quand un joueur n'a pas de classement dans la discipline. */
  points: number | null;
}

export interface TeamValue {
  formula: ChampionshipRules['valueFormula'];
  /** `null` = non calculable (classement manquant) ou formule inexistante. */
  value: number | null;
  total: number;
  divisor: number;
  lines: LineValue[];
  filledLines: number;
  expectedLines: number;
  incomplete: boolean;
  /** Licences dont le classement manque là où le calcul en avait besoin. */
  unrankedLicences: string[];
}

/** « SD » si la rencontre n'a qu'une ligne de cette discipline, « SH2 » sinon. */
export function lineLabel(format: MatchSlot[], discipline: Discipline, position: number): string {
  const count = format.filter((s) => s.discipline === discipline).length;
  return count > 1 ? `${discipline}${position}` : discipline;
}

/** Meilleur total de points d'un joueur, toutes disciplines confondues (barème fédéral). */
export function bestFfbadPoints(player: PlayerRanking): number {
  const scores = RANKED_DISCIPLINES.map((discipline) => {
    const ranking = rankingOf(player, discipline);
    if (ranking === null) return null;
    return ffbadPoints(ranking, {
      cpph: cpphOf(player, discipline),
      gender: player.gender,
      discipline
    });
  }).filter((n): n is number => n !== null);

  return scores.length > 0 ? Math.max(...scores) : 0;
}

function formatRankings(entry: LineupEntry, rankings: Array<Ranking | null>): string {
  return rankings.map((r) => r ?? '—').join('/') || String(entry.discipline);
}

/** Valeur d'une ligne au barème départemental. Un double vaut la moyenne de sa paire. */
function computeLine(entry: LineupEntry, format: MatchSlot[]): LineValue {
  const discipline = DISCIPLINE_RANKING[entry.discipline];
  const rankings = entry.players.map((p) => rankingOf(p, discipline));
  const known = rankings.filter((r): r is Ranking => r !== null);

  const expected = isDouble(entry.discipline) ? 2 : 1;
  const points =
    known.length === expected && entry.players.length === expected
      ? known.reduce((sum, r) => sum + cd91Points(r), 0) / expected
      : null;

  return {
    discipline: entry.discipline,
    position: entry.position,
    label: lineLabel(format, entry.discipline, entry.position),
    rankings: formatRankings(entry, rankings),
    points
  };
}

function unrankedIn(entry: LineupEntry): string[] {
  const discipline = DISCIPLINE_RANKING[entry.discipline];
  return entry.players.filter((p) => rankingOf(p, discipline) === null).map((p) => p.licence);
}

/**
 * Valeur départementale : somme des lignes ÷ nombre de matchs.
 *
 * Le diviseur est le nombre de lignes **composées**, pas celui du format : le règlement
 * est explicite, « si une équipe est incomplète, la division ne se fait plus par 7 ou 8,
 * mais par le nombre de matchs joués » (art. 6.3.5). Les deux coïncident quand l'équipe
 * est complète, et diviser par 7 une équipe à 6 lignes la sous-évaluerait — c'est-à-dire
 * la ferait passer pour conforme à tort.
 */
function perLineValue(entries: LineupEntry[], format: MatchSlot[]): TeamValue {
  const lines = entries.map((entry) => computeLine(entry, format));
  const unranked = [...new Set(entries.flatMap(unrankedIn))];

  const total = lines.reduce((sum, line) => sum + (line.points ?? 0), 0);
  const divisor = lines.length;
  const computable = divisor > 0 && lines.every((line) => line.points !== null);

  return {
    formula: 'perLine',
    value: computable ? total / divisor : null,
    total,
    divisor,
    lines,
    filledLines: divisor,
    expectedLines: format.length,
    incomplete: divisor < format.length,
    unrankedLicences: unranked
  };
}

/**
 * Valeur régionale : moyenne des 3 meilleurs joueurs et des 3 meilleures joueuses.
 *
 * On lit la feuille de composition, pas les lignes : un même joueur aligné deux fois ne
 * compte qu'une fois. Les places non pourvues valent zéro (art. 5.4.2), donc le diviseur
 * reste 6 même sur une équipe incomplète — ici, l'incomplétude fait bien baisser la valeur.
 */
function best3m3fValue(entries: LineupEntry[], format: MatchSlot[]): TeamValue {
  const roster = new Map<string, PlayerRanking>();
  entries.forEach((entry) => entry.players.forEach((p) => roster.set(p.licence, p)));

  const top3 = (gender: 'H' | 'F') =>
    [...roster.values()]
      .filter((p) => p.gender === gender)
      .map(bestFfbadPoints)
      .sort((a, b) => b - a)
      .slice(0, 3);

  const scores = [...top3('H'), ...top3('F')];
  const total = scores.reduce((sum, n) => sum + n, 0);

  return {
    formula: 'best3m3f',
    value: total / 6,
    total,
    divisor: 6,
    lines: entries.map((entry) => computeLine(entry, format)),
    filledLines: entries.length,
    expectedLines: format.length,
    incomplete: entries.length < format.length,
    unrankedLicences: [...roster.values()].filter((p) => bestFfbadPoints(p) === 0).map((p) => p.licence)
  };
}

export function computeTeamValue(
  rules: ChampionshipRules,
  format: MatchSlot[],
  entries: LineupEntry[]
): TeamValue {
  if (rules.valueFormula === 'best3m3f') return best3m3fValue(entries, format);

  const perLine = perLineValue(entries, format);
  // Vétérans : les lignes s'affichent, mais le règlement n'en tire aucune valeur d'équipe.
  if (rules.valueFormula === 'none') return { ...perLine, formula: 'none', value: null };
  return perLine;
}

/** Arrondi d'affichage : deux décimales, comme les exemples des règlements (7,71). */
export function formatValue(value: number | null): string {
  return value === null ? '—' : value.toFixed(2).replace('.', ',');
}
