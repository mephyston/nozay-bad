import type { Championship } from '../shared/championship';
import type { PlayerIdentity } from '../shared/members-lookup';
import type { Ranking, RankedDiscipline, Mutation } from '../shared/ranking';

export interface RosterPlayer extends PlayerIdentity {
  category: string | null;
  mutation: Mutation;
  singles: Ranking | null;
  doubles: Ranking | null;
  mixed: Ranking | null;
  /** `true` si le joueur est admis dans au moins une discipline de la division. */
  eligible: boolean;
  /** Disciplines où il peut s'aligner. Vide s'il n'est pas éligible. */
  eligibleDisciplines: RankedDiscipline[];
  /** Motif du refus, prêt à afficher. `null` s'il est admis. */
  ineligibilityReason: string | null;
  /** `false` : aucun classement connu à la date de référence. */
  hasRanking: boolean;
}

/** Une journée du calendrier, vue depuis l'équipe. */
export interface TeamCalendarDay {
  number: number;
  label: string | null;
  kind: 'regular' | 'playoff';
  weekStart: string;
  weekEnd: string;
  /** Date réelle saisie par le capitaine, ou celle fixée par le comité. */
  playedAt: string | null;
  venue: string | null;
  opponent: string | null;
  home: boolean;
  /** La rencontre est reportée hors de la semaine théorique. */
  outsideTheoreticalWeek: boolean;
  /** Nombre de lignes déjà composées. */
  filledLines: number;
}

export interface GetTeamOutput {
  id: number;
  seasonCode: string;
  championship: Championship;
  championshipLabel: string;
  division: string;
  divisionLabel: string;
  number: number;
  name: string;
  poolLabel: string | null;
  active: boolean;
  /** Rappel du format de rencontre, pour l'aide affichée à côté du formulaire. */
  matchCount: number;
  eligibilityRule: string;
  captain: PlayerIdentity | null;
  viceCaptain: PlayerIdentity | null;
  roster: RosterPlayer[];
  calendar: TeamCalendarDay[];
  /** Date des classements utilisés pour ce rendu. */
  referenceEloDate: string | null;
  /** Règlement de la saison pour ce championnat, à télécharger depuis la fiche d'équipe. */
  rulesUrl: string | null;
  rulesLabel: string | null;
  /**
   * D'où vient cette date. `latest` signale un championnat dont la référence dépend de
   * la journée : l'écran doit le dire, sans quoi on croirait la valeur figée.
   */
  referenceOrigin: 'season' | 'latest' | 'none';
}
