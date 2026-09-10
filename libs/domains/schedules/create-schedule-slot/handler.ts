import { type Db } from '@nba/db';
import { isOrderedRange } from '../shared/slot';
import { InvalidSlotTimesError, VenueNotFoundError } from '../shared/errors';
import { CreateScheduleSlotRepository } from './repository';
import type { CreateScheduleSlotInput, CreateScheduleSlotOutput } from './dto';

export async function createScheduleSlot(
  db: Db, input: CreateScheduleSlotInput, now: Date = new Date()
): Promise<CreateScheduleSlotOutput> {
  const repo = new CreateScheduleSlotRepository();

  // Un créneau qui finit avant de commencer s'affiche sans erreur et fausse tout le
  // tableau : mieux vaut le refuser à l'écriture.
  if (!isOrderedRange(input.startTime, input.endTime)) throw new InvalidSlotTimesError();
  if (!(await repo.findVenue(db, input.venueId))) throw new VenueNotFoundError();

  return repo.insert(db, {
    venueId: input.venueId,
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    audience: input.audience,
    label: input.label ?? null,
    coachName: input.coachName ?? null,
    indiv: input.indiv ?? false,
    active: true,
    createdAt: now
  });
}
