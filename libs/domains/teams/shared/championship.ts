/**
 * Les quatre règlements, en code.
 *
 * Ces règles vivent ici plutôt qu'en base parce qu'elles ne sont pas des données du club :
 * elles changent quand un comité vote un règlement, une fois par saison, et le code qui
 * les applique change en même temps. En base, elles seraient modifiables sans test et
 * dériveraient du calcul qu'elles pilotent.
 *
 * Sources : règlements 2026-2027 du CD91 (mixte, masculin, vétérans) et de la LIFB (ICRS),
 * dans `.data/règlements/`. Les numéros d'article cités renvoient à ces documents.
 */

import type { CategoryFamily } from './ranking';
import { DISCIPLINES, type Discipline, type Ranking } from './ranking';

export const CHAMPIONSHIPS = ['icr_seniors', 'icd_mixte', 'icd_masculin', 'icd_veterans'] as const;
export type Championship = (typeof CHAMPIONSHIPS)[number];

export const CHAMPIONSHIP_LABELS: Record<Championship, string> = {
  icr_seniors: 'Interclubs Régional Séniors',
  icd_mixte: 'Interclubs Départemental Mixte',
  icd_masculin: 'Interclubs Départemental Masculin',
  icd_veterans: 'Interclubs Départemental Vétérans'
};

/** Une ligne de la rencontre : « SH2 », « MX1 ». */
export interface MatchSlot {
  discipline: Discipline;
  position: number;
}

/**
 * Contrainte de classement d'une division.
 *
 * Les départementaux plafonnent (« au mieux classé D7 »), le régional plancher
 * (« être classé au moins D9 ») — deux logiques opposées qu'il serait dangereux de
 * réduire à une seule.
 */
export type Eligibility =
  | { kind: 'none' }
  /** Plafond, dans la seule discipline jouée. Ex. vétérans D1 : R6 maxi. */
  | { kind: 'atMostInDiscipline'; max: Ranking }
  /** Plafond, dans les trois disciplines. Ex. masculin D4 « Promotion » : P10 maxi. */
  | { kind: 'atMostInAll'; max: Ranking }
  /** Plancher, dans la discipline jouée. Ex. ICR PN : au moins D9. */
  | { kind: 'atLeastInDiscipline'; min: Ranking }
  /** Plancher, dans au moins une des trois. Ex. ICR R3 : P10 ou plus. */
  | { kind: 'atLeastInAny'; min: Ranking };

export interface DivisionRules {
  code: string;
  label: string;
  format: MatchSlot[];
  eligibility: Eligibility;
}

export interface ChampionshipRules {
  code: Championship;
  label: string;
  /** Barème de conversion classement → points. */
  scale: 'cd91' | 'ffbad';
  /** Formule de valeur d'équipe. `none` : le règlement n'en définit aucune. */
  valueFormula: 'perLine' | 'best3m3f' | 'none';
  /** Portée de la contrainte « équipe n ≤ équipe n−1 ». */
  hierarchy: 'sameChampionship' | 'exceptPromotion' | 'none';
  /** Comment se choisit le classement de référence. Voir `ranking-resolution.ts`. */
  rankingPolicy: 'season_fixed' | 'per_day';
  /** Catégories d'âge admises. `null` : le règlement ne restreint pas. */
  categories: CategoryFamily[] | null;
  /** Mutés admis par rencontre. `null` : aucune limite (vétérans, art. 6.1.4). */
  maxMuted: number | null;
  maxMatchesPerPlayer: number;
  /** Rencontres par journée : 2 en régional (art. 1.6.3), 1 ailleurs. */
  fixturesPerDay: number;
  /**
   * Jours où une rencontre se dispute, en ISO (1 = lundi … 7 = dimanche).
   *
   * Les départementaux mixte et masculin se jouent **en semaine, le soir** : « un club
   * peut recevoir du lundi au vendredi », convocation entre 19h30 et 20h30 (art. 3.4).
   * Les vétérans se jouent **le dimanche** (art. 3.3.1), le régional le **samedi ou le
   * dimanche** — il dispute deux rencontres par journée.
   *
   * C'est ce qui explique qu'une journée soit une *semaine* et non un week-end : deux
   * championnats peuvent occuper la même semaine sans partager le moindre jour. Un joueur
   * peut donc être sollicité le mardi en mixte et le dimanche en vétérans dans la même
   * semaine — ce que le règlement interdit pourtant, la contrainte portant sur la semaine
   * et non sur le jour.
   */
  matchDays: number[];
  /** Jours admis sur dérogation du comité, quand le gymnase manque. */
  matchDaysByDerogation: number[];
  divisions: DivisionRules[];
}

/**
 * Construit les lignes d'une rencontre à partir d'un décompte par discipline.
 * L'ordre suit celui des règlements — simples, puis doubles, puis mixtes.
 */
export function buildFormat(counts: Partial<Record<Discipline, number>>): MatchSlot[] {
  return DISCIPLINES.flatMap((discipline) =>
    Array.from({ length: counts[discipline] ?? 0 }, (_, i) => ({ discipline, position: i + 1 }))
  );
}

const SENIOR_AND_YOUTH: CategoryFamily[] = ['veteran', 'senior', 'junior', 'cadet', 'minime'];

/** 8 matchs : 2 SH, 2 SD, 1 DH, 1 DD, 2 MX. Régional, et division 1 du mixte. */
const FORMAT_8 = buildFormat({ SH: 2, SD: 2, DH: 1, DD: 1, MX: 2 });
/** 7 matchs : 3 SH, 1 SD, 1 DH, 1 DD, 1 MX. Mixte, à partir de la division 2. */
const FORMAT_7 = buildFormat({ SH: 3, SD: 1, DH: 1, DD: 1, MX: 1 });
/** 6 matchs : 4 SH, 2 DH. Masculin, toutes divisions. */
const FORMAT_6 = buildFormat({ SH: 4, DH: 2 });
/** 9 matchs : 2 SH, 1 SD, 2 DH, 1 DD, 3 MX. Vétérans, divisions 1 et 2. */
const FORMAT_9 = buildFormat({ SH: 2, SD: 1, DH: 2, DD: 1, MX: 3 });

const NO_LIMIT: Eligibility = { kind: 'none' };

export const CHAMPIONSHIP_RULES: Record<Championship, ChampionshipRules> = {
  // ── Régional séniors (LIFB) ────────────────────────────────────────────────
  icr_seniors: {
    code: 'icr_seniors',
    label: CHAMPIONSHIP_LABELS.icr_seniors,
    scale: 'ffbad',
    valueFormula: 'best3m3f',
    hierarchy: 'sameChampionship',
    // Art. 4.4.2 : les cotes de la mise à jour effectuée 10 jours avant chaque journée.
    rankingPolicy: 'per_day',
    categories: null,
    maxMuted: 2,
    maxMatchesPerPlayer: 2,
    fixturesPerDay: 2,
    // Samedi et dimanche. Le règlement pose le dimanche comme jour de principe et le
    // samedi sur dérogation, mais il programme aussi des horaires de samedi (14h, six
    // terrains minimum) — et une journée régionale compte **deux rencontres**, qui se
    // répartissent en pratique sur les deux jours.
    matchDays: [6, 7],
    matchDaysByDerogation: [],
    divisions: [
      { code: 'PN', label: 'Pré-Nationale', format: FORMAT_8, eligibility: { kind: 'atLeastInDiscipline', min: 'D9' } },
      { code: 'R1', label: 'Régionale 1', format: FORMAT_8, eligibility: { kind: 'atLeastInDiscipline', min: 'P10' } },
      { code: 'R2', label: 'Régionale 2', format: FORMAT_8, eligibility: { kind: 'atLeastInDiscipline', min: 'P10' } },
      { code: 'R3', label: 'Régionale 3', format: FORMAT_8, eligibility: { kind: 'atLeastInAny', min: 'P10' } }
    ]
  },

  // ── Départemental mixte (CD91) ─────────────────────────────────────────────
  // Art. 3.1 : le nombre de divisions n'est pas fixé par le règlement. D1 à D5 couvrent
  // la réalité du département ; seule la D1 change de format (8 matchs au lieu de 7).
  icd_mixte: {
    code: 'icd_mixte',
    label: CHAMPIONSHIP_LABELS.icd_mixte,
    scale: 'cd91',
    valueFormula: 'perLine',
    hierarchy: 'sameChampionship',
    // Art. 6.1.3 : classement arrêté à une date communiquée en début de saison.
    rankingPolicy: 'season_fixed',
    categories: SENIOR_AND_YOUTH,
    maxMuted: 2,
    maxMatchesPerPlayer: 2,
    fixturesPerDay: 1,
    // « Un club peut recevoir du lundi au vendredi », convocation entre 19h30 et 20h30.
    matchDays: [1, 2, 3, 4, 5],
    matchDaysByDerogation: [],
    divisions: [
      { code: 'D1', label: 'Division 1', format: FORMAT_8, eligibility: NO_LIMIT },
      { code: 'D2', label: 'Division 2', format: FORMAT_7, eligibility: NO_LIMIT },
      { code: 'D3', label: 'Division 3', format: FORMAT_7, eligibility: NO_LIMIT },
      { code: 'D4', label: 'Division 4', format: FORMAT_7, eligibility: NO_LIMIT },
      { code: 'D5', label: 'Division 5', format: FORMAT_7, eligibility: NO_LIMIT }
    ]
  },

  // ── Départemental masculin (CD91) ──────────────────────────────────────────
  icd_masculin: {
    code: 'icd_masculin',
    label: CHAMPIONSHIP_LABELS.icd_masculin,
    scale: 'cd91',
    valueFormula: 'perLine',
    // Art. 6.3.2 : la valeur ne se compare pas entre la D4 « Promotion » et les autres
    // divisions, mais elle se compare entre équipes de D4.
    hierarchy: 'exceptPromotion',
    rankingPolicy: 'season_fixed',
    categories: SENIOR_AND_YOUTH,
    maxMuted: 2,
    maxMatchesPerPlayer: 2,
    fixturesPerDay: 1,
    matchDays: [1, 2, 3, 4, 5],
    matchDaysByDerogation: [],
    divisions: [
      { code: 'D1', label: 'Division 1', format: FORMAT_6, eligibility: NO_LIMIT },
      { code: 'D2', label: 'Division 2', format: FORMAT_6, eligibility: { kind: 'atMostInDiscipline', max: 'D7' } },
      { code: 'D3', label: 'Division 3', format: FORMAT_6, eligibility: { kind: 'atMostInDiscipline', max: 'D7' } },
      { code: 'D4', label: 'Division 4 « Promotion »', format: FORMAT_6, eligibility: { kind: 'atMostInAll', max: 'P10' } }
    ]
  },

  // ── Départemental vétérans (CD91) ──────────────────────────────────────────
  icd_veterans: {
    code: 'icd_veterans',
    label: CHAMPIONSHIP_LABELS.icd_veterans,
    scale: 'cd91',
    // Le règlement vétérans ne définit aucune valeur d'équipe : il n'évalue que les
    // doubles, pour l'ordre des paires. Aucune hiérarchie entre équipes n'en découle.
    valueFormula: 'none',
    hierarchy: 'none',
    rankingPolicy: 'season_fixed',
    categories: ['veteran'],
    // Art. 6.1.4 : aucune limitation du nombre de mutés.
    maxMuted: null,
    maxMatchesPerPlayer: 2,
    fixturesPerDay: 1,
    // « Le jour retenu pour jouer les rencontres est le dimanche » ; le samedi est
    // accepté à titre exceptionnel si le club hôte n'a pas de gymnase le dimanche.
    matchDays: [7],
    matchDaysByDerogation: [6],
    divisions: [
      { code: 'D1', label: 'Division 1', format: FORMAT_9, eligibility: { kind: 'atMostInDiscipline', max: 'R6' } },
      { code: 'D2', label: 'Division 2', format: FORMAT_9, eligibility: { kind: 'atMostInDiscipline', max: 'D9' } }
    ]
  }
};

export function getChampionship(code: Championship): ChampionshipRules {
  return CHAMPIONSHIP_RULES[code];
}

export function getDivision(code: Championship, division: string): DivisionRules | undefined {
  return CHAMPIONSHIP_RULES[code].divisions.find((d) => d.code === division);
}

/** Préfixe des équipes du club. Le nom d'une équipe est dérivé, jamais saisi. */
export const CLUB_TEAM_PREFIX = 'NBA91';

/** Nom d'affichage d'une équipe : « NBA91-3 ». Le numéro porte la hiérarchie. */
export function teamName(number: number): string {
  return `${CLUB_TEAM_PREFIX}-${number}`;
}

/** Jour ISO d'une date (1 = lundi … 7 = dimanche), sans passer par le fuseau local. */
export function isoWeekday(iso: string): number {
  const day = new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export type MatchDayVerdict = 'allowed' | 'derogation' | 'unusual';

/**
 * Ce jour convient-il à une rencontre de ce championnat ?
 *
 * `unusual` n'est pas un refus : les comités accordent des dérogations qui ne figurent
 * dans aucun règlement, et bloquer obligerait le coach à fausser la date pour enregistrer.
 * L'écran le signale, il ne l'interdit pas.
 */
export function checkMatchDay(rules: ChampionshipRules, iso: string): MatchDayVerdict {
  const weekday = isoWeekday(iso);
  if (rules.matchDays.includes(weekday)) return 'allowed';
  if (rules.matchDaysByDerogation.includes(weekday)) return 'derogation';
  return 'unusual';
}
