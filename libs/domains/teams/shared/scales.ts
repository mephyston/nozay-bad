/**
 * Les deux barèmes classement → points.
 *
 * Ils n'ont rien en commun : le départemental compte de 0 à 12 par pas de 1, le régional
 * reprend le barème fédéral des Championnats de France (art. 8.1.1), non linéaire et
 * dont le sommet se subdivise selon la cote. Les additionner par erreur donnerait des
 * valeurs plausibles et fausses, d'où deux tables nommées distinctement.
 */

import type { Ranking, RankedDiscipline } from './ranking';

/** Barème CD91 — mixte, masculin et vétérans. Art. 6.3.3. */
export const CD91_SCALE: Record<Ranking, number> = {
  NC: 0, P12: 1, P11: 2, P10: 3, D9: 4, D8: 5, D7: 6,
  R6: 7, R5: 8, R4: 9, N3: 10, N2: 11, N1: 12
};

/**
 * Barème FFBaD — régional. Art. 5.4.1.
 *
 * `N1` est absent : il vaut de 57 à 93 selon la cote, voir `N1_TIERS`. `NC` non plus n'y
 * figure pas — le régional exige au minimum P10 — mais un joueur manquant compte pour
 * zéro (art. 5.4.2), et on retient 0 par cohérence.
 */
export const FFBAD_SCALE: Record<Exclude<Ranking, 'N1'>, number> = {
  NC: 0, P12: 1, P11: 2, P10: 3, D9: 6, D8: 9, D7: 12,
  R6: 18, R5: 24, R4: 30, N3: 39, N2: 48
};

/**
 * Paliers N1, par cote décroissante.
 *
 * Deux colonnes de seuils, et c'est bien la **discipline** qui les départage, pas le
 * genre du joueur : le double mixte est barémé avec les simples et doubles hommes.
 */
const N1_TIERS: Record<'sd_dd' | 'sh_dh_mx', Array<[minCpph: number, points: number]>> = {
  sd_dd: [[3500, 93], [3200, 84], [2800, 75], [2700, 66]],
  sh_dh_mx: [[4400, 93], [4100, 84], [3500, 75], [3400, 66]]
};

/** Palier le plus bas, retenu sous le dernier seuil et faute de cote connue. */
export const N1_FLOOR = 57;

/** Colonne de seuils applicable : les dames n'y sont qu'en simple et double dames. */
export function n1Column(gender: 'H' | 'F', discipline: RankedDiscipline): 'sd_dd' | 'sh_dh_mx' {
  return gender === 'F' && discipline !== 'mixed' ? 'sd_dd' : 'sh_dh_mx';
}

/**
 * Points d'un classement au barème fédéral.
 *
 * Une cote absente sur un N1 fait retenir le palier le plus bas : c'est le choix
 * prudent, il sous-estime l'équipe et ne peut donc pas faire passer pour conforme une
 * composition qui ne l'est pas. L'appelant lève un avertissement séparément.
 */
export function ffbadPoints(
  ranking: Ranking,
  options: { cpph?: number | null; gender: 'H' | 'F'; discipline: RankedDiscipline }
): number {
  if (ranking !== 'N1') return FFBAD_SCALE[ranking];

  const cpph = options.cpph;
  if (cpph == null) return N1_FLOOR;

  const tiers = N1_TIERS[n1Column(options.gender, options.discipline)];
  const tier = tiers.find(([min]) => cpph >= min);
  return tier ? tier[1] : N1_FLOOR;
}

/** Points d'un classement au barème départemental. */
export function cd91Points(ranking: Ranking): number {
  return CD91_SCALE[ranking];
}
