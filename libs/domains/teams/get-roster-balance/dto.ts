import type { Championship } from '../shared/championship';
import type { BalancePlayer } from '../shared/roster-balance';

export interface GetRosterBalanceInput {
  seasonCode: string;
  championship: Championship;
}

export interface RosterBalanceTeam {
  id: number;
  number: number;
  name: string;
  division: string;
  divisionLabel: string;
}

/** Un joueur du vivier : son classement de référence, et l'équipe où il est inscrit. */
export type RosterBalancePlayer = BalancePlayer & { photoUpdatedAt: number | null };

/**
 * Le vivier d'un championnat, tel que l'outil d'équilibrage le répartit.
 *
 * Le calcul se fait dans le navigateur : il évalue des milliers de répartitions, ce
 * qu'un Worker du plan gratuit ne peut pas faire dans ses 10 ms de CPU. L'API ne livre
 * donc que les données.
 */
export interface GetRosterBalanceOutput {
  championship: Championship;
  /** Date des classements utilisés ; `null` si aucun import n'existe encore. */
  referenceEloDate: string | null;
  teams: RosterBalanceTeam[];
  players: RosterBalancePlayer[];
  /**
   * Inscrits dans une équipe mais sans adhésion cette saison : hors du vivier, et
   * retirés de leur équipe si la répartition est appliquée. L'écran les nomme.
   */
  unknown: Array<{ licence: string; teamId: number }>;
}
