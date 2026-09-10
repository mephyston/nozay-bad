import type { ListIndivCandidatesOutput } from '../list-indiv-candidates/dto';

export interface SelectIndivInput {
  sessionId: number;
  /** La sélection **entière** : elle remplace la précédente, comme les invités du jeu libre. */
  selection: Array<{ requestId: number; slot: number }>;
}

export type SelectIndivOutput = ListIndivCandidatesOutput;
