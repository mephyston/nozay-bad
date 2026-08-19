import type { Championship } from '../shared/championship';
import type { Discipline, Ranking, Mutation } from '../shared/ranking';
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
  /** Fait partie de l'effectif déclaré : proposé en premier. */
  inRoster: boolean;
  /** Motif qui empêche de l'aligner, prêt à afficher. `null` s'il est disponible. */
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
  /** L'adhérent qui consulte peut-il modifier cette composition ? */
  canEdit: boolean;
  captainLicence: string | null;
  viceCaptainLicence: string | null;
}
