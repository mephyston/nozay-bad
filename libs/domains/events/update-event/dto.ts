import type { ClubEventRow } from '../shared/schema';

export interface UpdateEventInput {
  eventId: number;
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  venueLabel?: string | null;
  descriptionHtml?: string;
  status?: ClubEventRow['status'];
}
export type UpdateEventOutput = ClubEventRow;
