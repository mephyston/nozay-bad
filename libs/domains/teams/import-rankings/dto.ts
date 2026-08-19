export interface ImportRankingsInput {
  /** Contenu brut du CSV exporté depuis Poona. */
  content: string;
  /** Saison au titre de laquelle le rapprochement avec les adhérents est fait. */
  seasonCode: string;
  /**
   * Date ELO confirmée par l'utilisateur.
   *
   * L'écran la fait valider plutôt que de la déduire en silence : elle décide quel
   * classement fait foi pour toute la saison en départemental, et donc quelles
   * compositions seront conformes. Absente, on retient celle lue dans le fichier.
   */
  eloDate?: string;
  fileName?: string;
}

/** Un compétiteur qui ne figure pas au référentiel des adhérents de la saison. */
export interface UnmatchedCompetitor {
  licence: string;
  lastName: string;
  firstName: string;
}

export interface ImportRankingsOutput {
  eloDate: string;
  seasonCodes: string[];
  imported: number;
  /** Lignes sans aucun classement : des licenciés non compétiteurs, pas des erreurs. */
  nonCompetitors: number;
  /**
   * Compétiteurs absents du référentiel adhérents.
   *
   * L'import des classements **complète** celui des adhérents, il ne le remplace pas et
   * ne crée jamais personne. Ces licences sont remontées pour que le bureau relance
   * l'import des adhérents ; en attendant, ces joueurs ne sont alignables dans aucune
   * composition, faute d'exister au référentiel.
   */
  unmatched: UnmatchedCompetitor[];
  errors: Array<{ line: number; message: string }>;
}
