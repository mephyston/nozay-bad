import type { ScheduleSlotRow } from '../shared/schema';

export interface CreateScheduleSlotInput {
  venueId: number;
  weekday: number;
  startTime: string;
  endTime: string;
  audience: ScheduleSlotRow['audience'];
  label?: string;
  coachName?: string;
}
export type CreateScheduleSlotOutput = ScheduleSlotRow;
