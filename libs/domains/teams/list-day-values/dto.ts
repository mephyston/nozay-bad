import type { Championship } from '../shared/championship';
import type { LineupIssue } from '../shared/lineup-rules';

export interface DayTeamValue {
  teamId: number;
  name: string;
  number: number;
  divisionLabel: string;
  /** `null` : non calculable — classement manquant, ou date de référence non épinglée. */
  value: number | null;
  filledLines: number;
  expectedLines: number;
  /** Nom et valeur de l'équipe immédiatement supérieure, à journée égale. */
  upperTeamName: string | null;
  upperTeamValue: number | null;
  /** Écart avec l'équipe du dessus. Positif = infraction. `null` si incomparable. */
  delta: number | null;
  /**
   * La composition tient-elle la hiérarchie ?
   *
   * `null` quand la comparaison n'est pas possible : pas d'équipe au-dessus, valeur non
   * calculable, ou composition de l'autre équipe pas encore saisie. Un `null` n'est pas
   * un feu vert, c'est une absence de réponse — l'écran doit le dire.
   */
  conform: boolean | null;
  captainName: string | null;
  captainLicence: string | null;
  issues: LineupIssue[];
}

/** Un joueur aligné dans deux équipes du club la même semaine : l'infraction la plus coûteuse. */
export interface DuplicatePlayer {
  licence: string;
  name: string;
  teams: string[];
}

export interface ListDayValuesOutput {
  seasonCode: string;
  championship: Championship;
  championshipLabel: string;
  dayNumber: number;
  dayLabel: string | null;
  weekStart: string;
  weekEnd: string;
  /** Le championnat définit-il seulement une valeur d'équipe ? Faux pour les vétérans. */
  hasTeamValue: boolean;
  teams: DayTeamValue[];
  /** Calculé sur la **semaine**, tous championnats du groupe d'exclusion confondus. */
  duplicatePlayers: DuplicatePlayer[];
}
