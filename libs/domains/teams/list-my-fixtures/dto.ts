export interface ListMyFixturesInput {
  /** Licence de l'adhérent, imposée par l'appelant de confiance (session storefront). */
  licence: string;
  seasonCode: string;
  /** Nombre maximum de rencontres rendues. Toutes celles à venir par défaut. */
  limit?: number;
}

export interface MyFixture {
  teamId: number;
  teamName: string;
  championshipLabel: string;
  divisionLabel: string;
  dayNumber: number;
  /** « Barrages aller », ou `null` pour une journée régulière. */
  dayLabel: string | null;
  /** Semaine théorique : toujours connue, c'est elle que fixe le comité. */
  weekStart: string;
  weekEnd: string;
  /**
   * Date de la rencontre. `null` quand le capitaine ne l'a pas encore renseignée.
   *
   * Le comité arrête le calendrier en septembre-octobre et le président le transmet aux
   * capitaines : la date **existe** avant d'être saisie ici. Son absence est donc un
   * oubli de saisie, à signaler comme tel, et non une décision qu'on attendrait.
   */
  date: string | null;
  /**
   * D'où vient la date.
   *
   * `captain` : saisie sur la rencontre, heure comprise — c'est la seule qui fasse foi.
   * `committee` : jour commun fixé au calendrier, le dimanche des vétérans.
   * `null` : rien encore, seule la semaine est sûre.
   */
  dateSource: 'captain' | 'committee' | null;
  opponent: string | null;
  home: boolean;
  venue: string | null;
  /** L'adhérent est-il aligné sur cette rencontre, et sur quelle ligne ? */
  selected: boolean;
  /** « SH2 », « MX », ou `null` s'il n'est pas aligné. */
  slotLabel: string | null;
  /** La composition est-elle figée, ou encore en brouillon ? */
  lineupStatus: 'draft' | 'validated' | null;
  /**
   * Une composition existe-t-elle, quelle qu'elle soit ?
   *
   * Ne pas figurer sur la feuille ne dit pas la même chose selon les cas : « le capitaine
   * ne m'a pas retenu » se vit autrement que « le capitaine n'a rien saisi », et le
   * second est une relance à lui adresser, pas une déception à encaisser.
   */
  lineupExists: boolean;
}

export interface ListMyFixturesOutput {
  fixtures: MyFixture[];
}
