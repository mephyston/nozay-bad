import type { PlayerRankingRow } from '../shared/schema';

export interface ListRankingsInput {
  seasonCode: string;
  /** Date ELO à consulter. Absente : la plus récente connue. */
  eloDate?: string;
}

export interface RankingListItem extends PlayerRankingRow {
  /**
   * Le licencié figure-t-il au référentiel des adhérents de la saison ?
   *
   * `false` signale un rapprochement à faire : le bureau doit relancer l'import des
   * adhérents. En attendant, ce joueur n'est alignable dans aucune composition.
   */
  isMember: boolean;
}

export interface RankingDateSummary {
  eloDate: string;
  players: number;
}

export interface ListRankingsOutput {
  eloDate: string | null;
  /** Toutes les dates importées, de la plus récente à la plus ancienne. */
  availableDates: RankingDateSummary[];
  rows: RankingListItem[];
  unmatchedCount: number;
}
