import { type Db } from '@nba/db';
import { isOrderedRange } from '../shared/slot';
import { InvalidSlotTimesError, ScheduleSlotNotFoundError, VenueNotFoundError } from '../shared/errors';
import { UpdateScheduleSlotRepository } from './repository';
import type { UpdateScheduleSlotInput, UpdateScheduleSlotOutput } from './dto';

export async function updateScheduleSlot(
  db: Db, input: UpdateScheduleSlotInput
): Promise<UpdateScheduleSlotOutput> {
  const repo = new UpdateScheduleSlotRepository();

  const slot = await repo.findById(db, input.slotId);
  if (!slot) throw new ScheduleSlotNotFoundError();

  // Les horaires sont contrôlés ensemble : ne modifier qu'une borne peut inverser un
  // intervalle jusque-là valide.
  const startTime = input.startTime ?? slot.startTime;
  const endTime = input.endTime ?? slot.endTime;
  if (!isOrderedRange(startTime, endTime)) throw new InvalidSlotTimesError();

  // Même contrôle qu'à la création : la colonne porte une clé étrangère, mais D1 ne
  // l'applique pas toujours — un gymnase inexistant passerait donc en base.
  if (input.venueId !== undefined && !(await repo.findVenue(db, input.venueId))) {
    throw new VenueNotFoundError();
  }

  return repo.update(db, slot.id, {
    venueId: input.venueId ?? slot.venueId,
    audience: input.audience ?? slot.audience,
    weekday: input.weekday ?? slot.weekday,
    startTime,
    endTime,
    label: input.label === undefined ? slot.label : input.label,
    coachName: input.coachName === undefined ? slot.coachName : input.coachName,
    active: input.active ?? slot.active
  });
}
