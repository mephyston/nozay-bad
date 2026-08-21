export interface PlayerTeam {
  teamId: number;
  /** « NBA91-2 », tel que `teamName()` le compose. */
  name: string;
  championshipLabel: string;
  divisionLabel: string;
}

export interface PlayerCardRankings {
  singles: string | null;
  doubles: string | null;
  mixed: string | null;
  /**
   * `false` : aucune ligne de classement à la date de référence — un licencié non
   * compétiteur. À ne pas confondre avec `NC`, qui est un classement à part entière
   * (zéro point, mais alignable).
   */
  hasRanking: boolean;
}

export interface GetPlayerCardInput {
  licence: string;
  seasonCode: string;
}

export interface GetPlayerCardOutput {
  teams: PlayerTeam[];
  rankings: PlayerCardRankings;
  /** Date des classements affichés. `null` si aucun import n'a encore eu lieu. */
  referenceEloDate: string | null;
}
