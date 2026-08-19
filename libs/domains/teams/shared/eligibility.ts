/**
 * Qui a le droit de jouer, et dans quelle discipline.
 *
 * Les départementaux **plafonnent** (« au mieux classé D7 ») et le régional **planche**
 * (« être classé au moins D9 ») : deux logiques opposées qu'il serait dangereux de réduire
 * à une seule comparaison. D'où les quatre formes d'`Eligibility`.
 *
 * Un classement absent — le licencié non compétiteur — se traite différemment selon le
 * sens de la contrainte : il ne peut pas franchir un plancher, mais il ne dépasse aucun
 * plafond. Le confondre avec `NC` dans un sens comme dans l'autre produirait des refus ou
 * des autorisations également faux.
 */

import type { DivisionRules, Eligibility } from './championship';
import { isAtLeast, isAtMost, RANKED_DISCIPLINES, type RankedDiscipline } from './ranking';
import { rankingOf, type PlayerRanking } from './player';
import { categoryFamily, type CategoryFamily } from './ranking';

/** Le joueur est-il admis dans cette discipline, au regard du classement seul ? */
export function isEligibleInDiscipline(
  eligibility: Eligibility,
  player: PlayerRanking,
  discipline: RankedDiscipline
): boolean {
  const ranking = rankingOf(player, discipline);

  switch (eligibility.kind) {
    case 'none':
      return true;

    // Plafond : un joueur sans classement ne dépasse rien, il est donc admis.
    case 'atMostInDiscipline':
      return ranking === null || isAtMost(ranking, eligibility.max);

    case 'atMostInAll':
      return RANKED_DISCIPLINES.every((d) => {
        const r = rankingOf(player, d);
        return r === null || isAtMost(r, eligibility.max);
      });

    // Plancher : un joueur sans classement ne l'atteint pas.
    case 'atLeastInDiscipline':
      return ranking !== null && isAtLeast(ranking, eligibility.min);

    case 'atLeastInAny':
      return RANKED_DISCIPLINES.some((d) => {
        const r = rankingOf(player, d);
        return r !== null && isAtLeast(r, eligibility.min);
      });
  }
}

/** Les disciplines où le joueur peut s'aligner dans cette division. */
export function eligibleDisciplines(
  eligibility: Eligibility,
  player: PlayerRanking
): RankedDiscipline[] {
  return RANKED_DISCIPLINES.filter((d) => isEligibleInDiscipline(eligibility, player, d));
}

/** La catégorie d'âge du joueur est-elle admise ? `null` = le règlement ne restreint pas. */
export function isEligibleByCategory(
  categories: CategoryFamily[] | null,
  player: PlayerRanking
): boolean {
  if (categories === null) return true;
  const family = categoryFamily(player.category);
  // Une catégorie que Poona nommerait autrement ne doit pas bloquer une composition :
  // on laisse passer, et l'écran signale la catégorie inconnue.
  if (family === null) return true;
  return categories.includes(family);
}

export interface EligibilityVerdict {
  /** Admis dans au moins une discipline, et de catégorie admise. */
  eligible: boolean;
  disciplines: RankedDiscipline[];
  /** Motif du refus, prêt à afficher. `null` si admis. */
  reason: string | null;
}

/** Verdict complet pour une division : classement et catégorie. */
export function checkEligibility(
  division: DivisionRules,
  categories: CategoryFamily[] | null,
  player: PlayerRanking
): EligibilityVerdict {
  if (!isEligibleByCategory(categories, player)) {
    return {
      eligible: false,
      disciplines: [],
      reason: `Catégorie ${player.category ?? 'inconnue'} non admise dans ce championnat.`
    };
  }

  const disciplines = eligibleDisciplines(division.eligibility, player);
  if (disciplines.length === 0) {
    return { eligible: false, disciplines, reason: describeEligibility(division.eligibility) };
  }

  return { eligible: true, disciplines, reason: null };
}

/** Formulation lisible d'une contrainte, pour l'aide et les messages de refus. */
export function describeEligibility(eligibility: Eligibility): string {
  switch (eligibility.kind) {
    case 'none':
      return 'Aucune limite de classement.';
    case 'atMostInDiscipline':
      return `Classement ${eligibility.max} maximum dans la discipline jouée.`;
    case 'atMostInAll':
      return `Classement ${eligibility.max} maximum dans les trois disciplines.`;
    case 'atLeastInDiscipline':
      return `Classement ${eligibility.min} minimum dans la discipline jouée.`;
    case 'atLeastInAny':
      return `Classement ${eligibility.min} minimum dans au moins une des trois disciplines.`;
  }
}
