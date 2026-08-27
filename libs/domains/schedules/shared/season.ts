/**
 * La saison sportive d'une date, sans franchir la frontière du domaine comptable.
 *
 * `seasons` appartient à la comptabilité, avec ses vraies dates d'ouverture et de
 * clôture, et la VSA proscrit le SQL qui traverse les domaines. Or le jeu libre a besoin
 * d'un code de saison pour une seule question : **de quelle saison relève l'ouvreur qui
 * peut prendre cette séance ?** `open_play_openers` est la seule table du domaine qui
 * porte encore une saison, parce qu'un trousseau de clés se confie pour une année.
 *
 * Les séances, elles, sont datées : elles n'ont plus de colonne `season_code` depuis la
 * migration `0025`. La saison se déduit donc de la date, avec la convention du club — la
 * bascule au **1er août**, celle-là même que l'écran d'admin appliquait déjà pour
 * estampiller les créneaux qu'il créait.
 *
 * La convention est une approximation assumée : si un jour le référentiel comptable
 * ouvrait une saison au 15 juillet, une séance de fin juillet serait rattachée à la
 * saison précédente. Le club n'a jamais deux saisons en cours et ne tient pas de jeu
 * libre en juillet ; le jour où l'un des deux cesse d'être vrai, c'est le référentiel
 * qu'il faudra lire, pas cette règle qu'il faudra affiner.
 */

/** Mois de bascule, en numérotation humaine : août. */
const SEASON_START_MONTH = 8;

/**
 * « 2026-10-05 » → « 26-27 ».
 *
 * La date est découpée en texte et jamais confiée à `new Date` : le club n'a qu'un
 * fuseau, mais `new Date('2026-01-01')` s'interprète en UTC et reculerait d'un jour à
 * l'affichage local — de quoi faire basculer une date du 1er août.
 */
export function seasonCodeForDate(date: string): string {
  const [year, month] = date.split('-').map(Number);
  const startYear = month >= SEASON_START_MONTH ? year : year - 1;
  return `${String(startYear % 100).padStart(2, '0')}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/**
 * « 26-27 » → les bornes de dates de la saison, incluses.
 *
 * Réciproque de `seasonCodeForDate`, pour les agrégats qui comptaient jusqu'ici sur la
 * colonne `season_code` des séances.
 */
export function seasonDateRange(seasonCode: string): { from: string; to: string } {
  const startYear = 2000 + Number(seasonCode.slice(0, 2));
  return { from: `${startYear}-${String(SEASON_START_MONTH).padStart(2, '0')}-01`, to: `${startYear + 1}-07-31` };
}
