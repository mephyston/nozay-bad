export interface ListClubPlayersInput {
  seasonCode: string;
}

/** Un adhérent de la saison, tel que l'annuaire du club l'affiche. */
export interface ClubPlayer {
  licence: string;
  firstName: string;
  lastName: string;
  /** Version du portrait, en millisecondes. `null` : aucune photo. */
  photoUpdatedAt: number | null;
  /**
   * Catégorie d'âge Poona, telle qu'elle est écrite dans l'export : « Senior »,
   * « Veteran 5 », « Minime 2 »… Libellé brut et non énumération : la liste change
   * d'une saison à l'autre, et l'annuaire n'en fait qu'un mot à afficher.
   */
  category: string | null;
  /** Libellé de la fonction au club (« Président »), ou `null`. */
  clubFunction: string | null;
  singles: string | null;
  doubles: string | null;
  mixed: string | null;
  /**
   * Moyenne des cotes CPPH des trois tableaux — la valeur ELO du joueur, en points.
   *
   * Moyennée sur les **tableaux effectivement classés**, et non systématiquement sur
   * trois : un joueur classé en simple seul verrait sinon sa cote divisée par trois et
   * se retrouverait au bas de l'annuaire, ce qu'il n'est pas. `null` quand aucun
   * tableau n'a de cote — un licencié non compétiteur.
   */
  eloAverage: number | null;
  /**
   * `false` : aucune ligne de classement à la date de référence — un licencié non
   * compétiteur. À ne pas confondre avec `NC`, qui est un classement à part entière.
   */
  hasRanking: boolean;
}

export interface ListClubPlayersOutput {
  players: ClubPlayer[];
  /** Date des classements affichés. `null` si aucun import n'a encore eu lieu. */
  referenceEloDate: string | null;
}
