import type { OpenPlaySessionRow } from '../../shared/open-play-schema';

export interface CreateOpenPlaySessionInput {
  seasonCode: string;
  venueId: number;
  /** Date locale « 2026-03-14 ». */
  date: string;
  startTime: string;
  endTime: string;
  /** Absent = le seuil habituel du club (`DEFAULT_MIN_PLAYERS`). */
  minPlayers?: number;
  label?: string;
  notes?: string;
}

export type CreateOpenPlaySessionOutput = OpenPlaySessionRow;
