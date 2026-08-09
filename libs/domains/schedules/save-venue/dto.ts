import type { VenueRow } from '../shared/schema';

export interface SaveVenueInput {
  code: string;
  name: string;
  streetAddress?: string;
  postalCode?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
}
export type SaveVenueOutput = VenueRow;
