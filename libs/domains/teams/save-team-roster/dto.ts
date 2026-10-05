export interface SaveTeamRosterInput {
  teamId: number;
  /** Effectif complet de l'équipe : la liste remplace l'existante. */
  licences: string[];
}

export interface SaveTeamRosterOutput {
  teamId: number;
  count: number;
  /** Licences écartées parce qu'absentes du référentiel des adhérents. */
  rejected: string[];
  /** Licences écartées parce que le championnat n'admet pas leur catégorie d'âge. */
  outOfCategory: string[];
}
