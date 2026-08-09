import type { ClubEventRow } from '../shared/schema';

export interface ListEventsInput {
  /** Par défaut, seuls les événements à venir : c'est ce qu'attend un agenda. */
  includePast?: boolean;
  includeUnpublished?: boolean;
  limit?: number;
}
export type ListEventsOutput = ClubEventRow[];
