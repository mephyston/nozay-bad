import { Hono } from 'hono';

import { listVenuesRoute } from './list-venues/route';
import { saveVenueRoute } from './save-venue/route';
import { listScheduleSlotsRoute } from './list-schedule-slots/route';
import { createScheduleSlotRoute } from './create-schedule-slot/route';
import { updateScheduleSlotRoute } from './update-schedule-slot/route';
import { deleteScheduleSlotRoute } from './delete-schedule-slot/route';

export type Bindings = { DB: D1Database };

export const schedulesRouter = new Hono<{ Bindings: Bindings }>();

// `/venues` avant les motifs à paramètre : Hono retient la première correspondance, et
// `/:id` capterait le segment littéral.
schedulesRouter.route('/', listVenuesRoute);
schedulesRouter.route('/', saveVenueRoute);
schedulesRouter.route('/', listScheduleSlotsRoute);
schedulesRouter.route('/', createScheduleSlotRoute);
schedulesRouter.route('/', updateScheduleSlotRoute);
schedulesRouter.route('/', deleteScheduleSlotRoute);

export { listScheduleSlots } from './list-schedule-slots/handler';
export { listVenues } from './list-venues/handler';
export type { ScheduleSlotView } from './list-schedule-slots/dto';
export { AUDIENCE_LABELS, WEEKDAY_LABELS } from './shared/schema';
export type { ScheduleSlotRow, VenueRow } from './shared/schema';
