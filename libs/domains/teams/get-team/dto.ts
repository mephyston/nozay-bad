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

/**
 * Une **rencontre** du calendrier, vue depuis l'équipe.
 *
 * Une entrée par rencontre, et non par journée : le régional en dispute **deux par
 * journée** (art. 1.6.3), donc deux compositions distinctes. Le calendrier les indexait
 * auparavant par journée, si bien que la seconde écrasait silencieusement la première —
 * elle était invisible, et inatteignable.
 */
export interface TeamCalendarDay {
  number: number;
  /**
   * Identifiant de la journée, nécessaire pour écrire la rencontre côté administration.
   * `PUT /teams/:id/fixtures` désigne la journée par son identifiant, là où l'espace
   * adhérent la désigne par son numéro.
   */
  dayId: number;
  /** 1 partout, 1 ou 2 en régional. Identifie la rencontre au sein de la journée. */
  slot: number;
  /**
   * Comment nommer cette rencontre quand la journée en compte plusieurs : l'adversaire
   * s'il est saisi, « Rencontre n » sinon. `null` quand la journée n'en compte qu'une —
   * l'écran s'en tient alors au libellé de la journée.
   */
  fixtureLabel: string | null;
  label: string | null;
  kind: 'regular' | 'playoff';
  weekStart: string;
  weekEnd: string;
  /** Date réelle saisie par le capitaine, ou celle fixée par le comité. */
  playedAt: string | null;
  venue: string | null;
  opponent: string | null;
  home: boolean;
  /**
   * `bye` = équipe au repos, `forfeit` = forfait. Renvoyé pour que l'écran d'écriture le
   * fasse transiter inchangé : `saveFixture` réécrit la rencontre entière, si bien
   * qu'omettre ce champ ramènerait silencieusement la rencontre à « programmée ».
   */
  status: 'scheduled' | 'bye' | 'forfeit';
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
