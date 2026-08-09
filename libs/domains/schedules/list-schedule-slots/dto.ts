import type { ScheduleSlotRow, VenueRow } from '../shared/schema';

export interface ListScheduleSlotsInput {
  seasonCode?: string;
  audiences?: string[];
  venueId?: number;
  /** Absent = seulement les créneaux actifs, ce que veut le site public. */
  includeInactive?: boolean;
}

export interface ScheduleSlotView extends ScheduleSlotRow {
  venue: VenueRow | null;
}

export type ListScheduleSlotsOutput = ScheduleSlotView[];
