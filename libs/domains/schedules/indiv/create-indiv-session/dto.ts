import type { IndivSessionRow } from '../../shared/indiv-schema';

export interface CreateIndivSessionInput {
  venueId: number;
  /** Date locale « 2026-03-17 ». */
  date: string;
  startTime: string;
  /** Absents = l'habitude du club : deux créneaux de trente minutes, deux places chacun. */
  slotCount?: number;
  slotMinutes?: number;
  capacityPerSlot?: number;
  label?: string | null;
  notes?: string | null;
}

export type CreateIndivSessionOutput = IndivSessionRow;
