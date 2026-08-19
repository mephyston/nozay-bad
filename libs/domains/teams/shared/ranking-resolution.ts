/**
 * Quel classement fait foi, et à quelle date.
 *
 * C'est le seul module qui connaît la divergence entre les règlements sur ce point, et
 * elle est réelle :
 *
 * - **Départemental** — « le classement pris en compte **pour toute la saison** sera celui
 *   à une date communiquée aux capitaines en début de saison » (art. 6.1.3). Une date
 *   unique, épinglée par le coach, qu'un reclassement en cours de saison ne déplace pas.
 * - **Régional** — « les classements et cotes pris en compte doivent être ceux de la mise à
 *   jour effectuée 10 jours avant chaque journée, le jeudi précédant la semaine comprenant
 *   la journée » (art. 4.4.2). La référence bouge à chaque journée.
 *
 * Le classement en vigueur pour un joueur à une date est celui de plus grande date ELO
 * antérieure ou égale. Cette formulation absorbe les exports partiels : un joueur absent
 * d'un export récent conserve son classement précédent, ce qui est exactement ce que veut
 * le règlement.
 */

import type { ChampionshipRules } from './championship';

export interface ChampionshipSettings {
  /** Date ELO épinglée pour la saison. Utilisée par les championnats départementaux. */
  referenceEloDate: string | null;
}

export interface ChampionshipDay {
  number: number;
  /** Lundi de la semaine de la journée, en ISO. */
  weekStart: string;
  /** Date ELO forcée sur cette journée. Prime sur tout le reste. */
  referenceEloDate?: string | null;
}

export type ReferenceOrigin =
  /** Le coach a forcé une date sur cette journée. */
  | 'forced'
  /** Date épinglée pour la saison (départemental). */
  | 'season'
  /** Jeudi précédant la semaine de la journée (régional). */
  | 'day'
  /** Aucune date déterminable : rien n'est épinglé. */
  | 'none';

export interface ReferenceDate {
  date: string | null;
  origin: ReferenceOrigin;
}

/** Ajoute (ou retire) des jours à une date ISO, sans passer par le fuseau local. */
export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Le jeudi qui précède la semaine d'une journée.
 *
 * `weekStart` est le lundi ; quatre jours en arrière tombent sur le jeudi précédent.
 * C'est la lettre de l'article 4.4.2, et non « dix jours avant », qui donnerait un
 * vendredi et n'existe pas comme date de publication.
 */
export function thursdayBefore(weekStart: string): string {
  return shiftIsoDate(weekStart, -4);
}

export function resolveReferenceDate(
  rules: ChampionshipRules,
  settings: ChampionshipSettings | null,
  day: ChampionshipDay | null
): ReferenceDate {
  if (day?.referenceEloDate) return { date: day.referenceEloDate, origin: 'forced' };

  if (rules.rankingPolicy === 'season_fixed') {
    const date = settings?.referenceEloDate ?? null;
    return { date, origin: date ? 'season' : 'none' };
  }

  if (!day) return { date: null, origin: 'none' };
  return { date: thursdayBefore(day.weekStart), origin: 'day' };
}

/** Ce qu'il faut d'une ligne de classement pour la dater. */
export interface DatedRanking {
  licence: string;
  eloDate: string;
}

/**
 * Classement en vigueur de chaque joueur à la date donnée.
 *
 * Sans date de référence, on ne devine pas : on ne retient rien. Retomber sur « le
 * classement le plus récent » ferait calculer des valeurs d'équipe apparemment normales
 * sur une base que le règlement rejette — une erreur invisible, donc la pire.
 */
export function pickRankingsAt<T extends DatedRanking>(rows: T[], atDate: string | null): Map<string, T> {
  const picked = new Map<string, T>();
  if (!atDate) return picked;

  for (const row of rows) {
    if (row.eloDate > atDate) continue;
    const current = picked.get(row.licence);
    if (!current || row.eloDate > current.eloDate) picked.set(row.licence, row);
  }
  return picked;
}
