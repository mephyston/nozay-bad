import type { Championship } from '../shared/championship';
import type { PlayerIdentity } from '../shared/members-lookup';

export interface TeamListItem {
  id: number;
  seasonCode: string;
  championship: Championship;
  championshipLabel: string;
  division: string;
  divisionLabel: string;
  /** Le rang dans le club : c'est lui que lit la règle de hiérarchie des valeurs. */
  number: number;
  /** Dérivé du numéro (`NBA91-3`), jamais stocké. */
  name: string;
  poolLabel: string | null;
  active: boolean;
  captain: PlayerIdentity | null;
  viceCaptain: PlayerIdentity | null;
  rosterCount: number;
  /** Nombre de matchs de la rencontre, d'après le format de la division. */
  matchCount: number;
  /**
   * Ce que le lecteur est dans cette équipe, quand la liste est demandée pour quelqu'un.
   *
   * Le staff prime sur l'effectif : un capitaine inscrit à son propre effectif reste
   * d'abord un capitaine, c'est à ce titre qu'il compose. `null` côté administration,
   * où la liste n'est celle de personne en particulier.
   */
  viewerRole: TeamViewerRole;
}

/** Le lien du lecteur avec l'équipe, du plus engageant au plus lointain. */
export type TeamViewerRole = 'captain' | 'viceCaptain' | 'player' | null;

export interface ListTeamsOutput {
  seasonCode: string;
  teams: TeamListItem[];
}
