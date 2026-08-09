import type { ClubEventRow } from '../shared/schema';

export interface CreateEventInput {
  title: string;
  slug?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  category: ClubEventRow['category'];
  venueLabel?: string;
  descriptionHtml?: string;
  externalUrl?: string;
}
export type CreateEventOutput = ClubEventRow;
