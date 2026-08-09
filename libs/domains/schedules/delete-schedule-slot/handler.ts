import { type Db } from '@nba/db';
import { ScheduleSlotNotFoundError } from '../shared/errors';
import { DeleteScheduleSlotRepository } from './repository';
import type { DeleteScheduleSlotInput, DeleteScheduleSlotOutput } from './dto';

export async function deleteScheduleSlot(
  db: Db, input: DeleteScheduleSlotInput
): Promise<DeleteScheduleSlotOutput> {
  const repo = new DeleteScheduleSlotRepository();
  if (!(await repo.findById(db, input.slotId))) throw new ScheduleSlotNotFoundError();
  await repo.remove(db, input.slotId);
  return { deleted: true };
}
