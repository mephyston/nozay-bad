/**
 * Le classement d'un joueur, tel que le calcul le consomme.
 *
 * Volontairement détaché de la ligne de base : les modules de calcul (`team-value`,
 * `lineup-rules`) ne connaissent ni drizzle ni l'export Poona, et se testent avec des
 * objets littéraux. Le dépôt fait la conversion.
 */

import type { Mutation, Ranking, RankedDiscipline } from './ranking';

export interface PlayerRanking {
  licence: string;
  lastName: string;
  firstName: string;
  gender: 'H' | 'F';
  /** Libellé Poona brut (« Veteran 5 »), interprété par `categoryFamily`. */
  category: string | null;
  mutation: Mutation;
  /**
   * `null` = licencié **non compétiteur**, la cellule de l'export est vide.
   * `'NC'` = compétiteur sans classement, qui vaut 0 point mais peut jouer.
   */
  singles: Ranking | null;
  doubles: Ranking | null;
  mixed: Ranking | null;
  cpphSingles: number | null;
  cpphDoubles: number | null;
  cpphMixed: number | null;
}

export function rankingOf(player: PlayerRanking, discipline: RankedDiscipline): Ranking | null {
  if (discipline === 'singles') return player.singles;
  if (discipline === 'doubles') return player.doubles;
  return player.mixed;
}

export function cpphOf(player: PlayerRanking, discipline: RankedDiscipline): number | null {
  if (discipline === 'singles') return player.cpphSingles;
  if (discipline === 'doubles') return player.cpphDoubles;
  return player.cpphMixed;
}

/** A-t-il un classement dans au moins une discipline ? Sinon : non compétiteur. */
export function isCompetitor(player: PlayerRanking): boolean {
  return player.singles !== null || player.doubles !== null || player.mixed !== null;
}

export function fullName(player: PlayerRanking): string {
  return `${player.firstName} ${player.lastName}`;
}
