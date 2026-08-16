/**
 * Vocabulaire fédéral : classements, disciplines, catégories d'âge, mutations.
 *
 * Ce module ne connaît ni la base ni les règlements — il n'écrit que ce que la FFBaD
 * impose à tout le monde. Les règles qui varient d'un championnat à l'autre vivent dans
 * `championship.ts`, et les formules de valeur dans `team-value.ts`.
 */

/** Les treize classements fédéraux, du plus faible au plus fort. L'ordre porte du sens. */
export const RANKINGS = [
  'NC', 'P12', 'P11', 'P10', 'D9', 'D8', 'D7', 'R6', 'R5', 'R4', 'N3', 'N2', 'N1'
] as const;

export type Ranking = (typeof RANKINGS)[number];

const RANKING_SET = new Set<string>(RANKINGS);

export function isRanking(value: string): value is Ranking {
  return RANKING_SET.has(value);
}

/**
 * Force d'un classement, pour comparer.
 *
 * `NC` vaut 0 : c'est un classement à part entière, celui d'un compétiteur qui n'a pas
 * encore de résultat. Un licencié **non compétiteur** n'a pas de classement du tout —
 * l'export Poona laisse la cellule vide, et on stocke `null`. Confondre les deux
 * ferait entrer dans une équipe quelqu'un qui n'y a pas sa place.
 */
export function rankingStrength(ranking: Ranking): number {
  return RANKINGS.indexOf(ranking);
}

/** `a` est-il au mieux classé `max` ? (« au mieux classé D7 » = D7 ou moins fort) */
export function isAtMost(ranking: Ranking, max: Ranking): boolean {
  return rankingStrength(ranking) <= rankingStrength(max);
}

/** `a` est-il au moins classé `min` ? (« être classé au moins D9 » = D9 ou plus fort) */
export function isAtLeast(ranking: Ranking, min: Ranking): boolean {
  return rankingStrength(ranking) >= rankingStrength(min);
}

// ── Disciplines ──────────────────────────────────────────────────────────────

/** Les cinq types de match d'une rencontre d'interclubs. */
export const DISCIPLINES = ['SH', 'SD', 'DH', 'DD', 'MX'] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  SH: 'Simple homme',
  SD: 'Simple dame',
  DH: 'Double homme',
  DD: 'Double dame',
  MX: 'Double mixte'
};

/** Une paire, ou un joueur seul. */
export function isDouble(discipline: Discipline): boolean {
  return discipline !== 'SH' && discipline !== 'SD';
}

/**
 * Les trois classements que porte un joueur, tels que les nomme l'export Poona.
 * Un match de double dame relève du classement « double », un mixte du classement
 * « mixte » : c'est cette correspondance qui décide quel classement lire.
 */
export const RANKED_DISCIPLINES = ['singles', 'doubles', 'mixed'] as const;
export type RankedDiscipline = (typeof RANKED_DISCIPLINES)[number];

export const DISCIPLINE_RANKING: Record<Discipline, RankedDiscipline> = {
  SH: 'singles',
  SD: 'singles',
  DH: 'doubles',
  DD: 'doubles',
  MX: 'mixed'
};

/** Genres admis sur une ligne : `null` pour le mixte, qui en veut un de chaque. */
export const DISCIPLINE_GENDER: Record<Discipline, 'H' | 'F' | null> = {
  SH: 'H',
  SD: 'F',
  DH: 'H',
  DD: 'F',
  MX: null
};

// ── Catégories d'âge ─────────────────────────────────────────────────────────

/**
 * Familles de catégories, extraites du libellé Poona (« Veteran 5 », « Cadet 2 »).
 *
 * On ne fige pas la liste complète des libellés en énumération : Poona en ajoute au gré
 * des saisons, et une valeur inconnue doit dégrader en avertissement, jamais faire
 * échouer un import de 213 lignes.
 */
export const CATEGORY_FAMILIES = [
  'minibad', 'poussin', 'benjamin', 'minime', 'cadet', 'junior', 'senior', 'veteran'
] as const;

export type CategoryFamily = (typeof CATEGORY_FAMILIES)[number];

const FAMILY_PREFIXES: Array<[string, CategoryFamily]> = [
  ['minibad', 'minibad'],
  ['poussin', 'poussin'],
  ['benjamin', 'benjamin'],
  ['minime', 'minime'],
  ['cadet', 'cadet'],
  ['junior', 'junior'],
  ['senior', 'senior'],
  ['veteran', 'veteran'],
  ['vétéran', 'veteran']
];

/** Normalise pour comparer : « Vétéran 5 » et « Veteran 5 » sont la même chose. */
function fold(raw: string): string {
  return raw.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

export function categoryFamily(raw: string | null | undefined): CategoryFamily | null {
  if (!raw) return null;
  const folded = fold(raw);
  const match = FAMILY_PREFIXES.find(([prefix]) => folded.startsWith(fold(prefix)));
  return match ? match[1] : null;
}

/** « Veteran 5 » → 5. `null` si la catégorie n'est pas vétéran ou n'a pas de rang. */
export function veteranLevel(raw: string | null | undefined): number | null {
  if (categoryFamily(raw) !== 'veteran') return null;
  const match = fold(raw as string).match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

// ── Mutations ────────────────────────────────────────────────────────────────

export type Mutation = 'none' | 'normal' | 'dossier';

/** Les libellés observés dans l'export Poona ; tout le reste est traité comme muté. */
export function parseMutation(raw: string | null | undefined): Mutation {
  const folded = fold(raw ?? '');
  if (!folded || folded.startsWith('non mute')) return 'none';
  if (folded.includes('dossier')) return 'dossier';
  return 'normal';
}

export function isMuted(mutation: Mutation): boolean {
  return mutation !== 'none';
}

/**
 * Licence sur huit caractères, zéros de tête compris.
 *
 * L'export ELO les écrit (« 07104079 ») ; d'autres exports Poona les perdent dès qu'un
 * tableur est passé par là. Toute jointure entre classements et adhérents passe par
 * cette normalisation, sans quoi elle échoue en silence — le pire des symptômes, parce
 * qu'il ressemble à « ce joueur n'a pas de classement ».
 */
export function normalizeLicence(raw: string): string {
  return raw.trim().replace(/\D/g, '').padStart(8, '0');
}
