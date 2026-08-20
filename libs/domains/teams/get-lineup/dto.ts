import type { Championship } from '../shared/championship';
import type { Discipline, Ranking, Mutation, RankedDiscipline } from '../shared/ranking';
import type { LineupIssue } from '../shared/lineup-rules';

/** Une ligne de la rencontre, telle que l'écran la présente. */
export interface LineupSlotView {
  discipline: Discipline;
  position: number;
  /** « SH2 », ou « SD » quand la rencontre n'en compte qu'une. */
  label: string;
  double: boolean;
  licence1: string | null;
  licence2: string | null;
  /** Classements lus, « N2/D7 ». */
  rankings: string;
  points: number | null;
}

/** Un joueur proposé au capitaine. */
export interface LineupCandidate {
  licence: string;
  firstName: string;
  lastName: string;
  gender: 'H' | 'F';
  category: string | null;
  mutation: Mutation;
  singles: Ranking | null;
  doubles: Ranking | null;
  mixed: Ranking | null;
  /** Fait partie de l'effectif déclaré. */
  inRoster: boolean;
  /**
   * Les disciplines de classement où ce joueur est admis dans cette division.
   *
   * L'éligibilité se juge **tableau par tableau** : en régional, PN à R2 exigent un
   * classement minimum *dans la discipline jouée* (art. 4.4). Un joueur classé en simple
   * mais sans classement en double est donc admis sur les simples et refusé sur les
   * doubles. Un unique booléen d'éligibilité — le précédent modèle — se trompait dans les
   * deux sens : il proposait ce joueur en double, et aurait pu l'écarter des simples.
   */
  eligibleDisciplines: RankedDiscipline[];
  /**
   * Motif qui empêche de l'aligner **quel que soit le tableau** : déjà aligné cette
   * semaine, catégorie non admise, ou éligible dans aucune discipline. `null` s'il est
   * alignable quelque part — l'écran croise alors `eligibleDisciplines` avec la ligne.
   */
  unavailableReason: string | null;
}

export interface GetLineupOutput {
  teamId: number;
  teamName: string;
  championship: Championship;
  championshipLabel: string;
  divisionLabel: string;
  dayNumber: number;
  /** « Barrages aller », ou `null` pour une journée régulière. */
  dayLabel: string | null;
  weekStart: string;
  weekEnd: string;
  /** Date de jeu fixée par le comité pour tout le championnat (vétérans, régional). */
  matchDate: string | null;
  /**
   * Date et heure réelles de **cette** rencontre, saisies par le capitaine.
   * Distincte de la semaine théorique, qui reste figée et porte les règles.
   */
  playedAt: string | null;
  /** La date réelle sort de la semaine théorique : report exceptionnel. */
  outsideTheoreticalWeek: boolean;
  venue: string | null;
  opponent: string | null;
  home: boolean;
  status: 'scheduled' | 'bye' | 'forfeit';
  slots: LineupSlotView[];
  candidates: LineupCandidate[];
  /** Total et valeur d'équipe, `null` si non calculable. */
  total: number;
  divisor: number;
  value: number | null;
  errors: LineupIssue[];
  warnings: LineupIssue[];
  /** Plafond à respecter : la valeur de l'équipe du dessus sur cette journée. */
  upperTeamName: string | null;
  upperTeamValue: number | null;
  referenceEloDate: string | null;
  /**
   * Pourquoi aucun classement n'est exploitable, `null` si tout va bien.
   *
   * Sans classement à la date de référence, chaque joueur est lu comme non classé — et
   * une division à plancher (le régional exige P10 minimum) déclare alors *tout*
   * l'effectif inéligible. L'écran devenait un cul-de-sac muet : toutes les lignes
   * désactivées, aucun motif. On ne devine pas un classement de remplacement — ce serait
   * une erreur invisible — mais on doit dire pourquoi on ne peut pas composer.
   */
  rankingsUnavailableReason: string | null;
  /** L'adhérent qui consulte peut-il modifier cette composition ? */
  canEdit: boolean;
  captainLicence: string | null;
  viceCaptainLicence: string | null;
}
