import type { ScheduleSlotRow } from '../shared/schema';

export interface UpdateScheduleSlotInput {
  slotId: number;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  label?: string | null;
  coachName?: string | null;
  active?: boolean;
}
export type UpdateScheduleSlotOutput = ScheduleSlotRow;
