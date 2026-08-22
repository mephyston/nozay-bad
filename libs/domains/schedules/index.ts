import { Hono } from 'hono';

import { listVenuesRoute } from './list-venues/route';
import { saveVenueRoute } from './save-venue/route';
import { listScheduleSlotsRoute } from './list-schedule-slots/route';
import { createScheduleSlotRoute } from './create-schedule-slot/route';
import { updateScheduleSlotRoute } from './update-schedule-slot/route';
import { deleteScheduleSlotRoute } from './delete-schedule-slot/route';

import { listOpenPlaySessionsRoute } from './open-play/list-open-play-sessions/route';
import { createOpenPlaySessionRoute } from './open-play/create-open-play-session/route';
import { updateOpenPlaySessionRoute } from './open-play/update-open-play-session/route';
import { registerToOpenPlayRoute } from './open-play/register-to-open-play/route';
import { unregisterFromOpenPlayRoute } from './open-play/unregister-from-open-play/route';
import { listOpenPlayRegistrationsRoute } from './open-play/list-open-play-registrations/route';

export type Bindings = { DB: D1Database };

export const schedulesRouter = new Hono<{ Bindings: Bindings }>();

// `/venues` avant les motifs à paramètre : Hono retient la première correspondance, et
// `/:id` capterait le segment littéral.
schedulesRouter.route('/', listVenuesRoute);
schedulesRouter.route('/', saveVenueRoute);
schedulesRouter.route('/', listScheduleSlotsRoute);
schedulesRouter.route('/', createScheduleSlotRoute);
// Jeu libre AVANT les motifs à paramètre pour la même raison que `/venues` : `PUT /:id`
// capterait `/open-play`. À l'intérieur du bloc, `/open-play/:id/registrations` et
// `/open-play/:id` ne se recouvrent pas — les deux segments finaux diffèrent.
schedulesRouter.route('/', listOpenPlaySessionsRoute);
schedulesRouter.route('/', createOpenPlaySessionRoute);
schedulesRouter.route('/', listOpenPlayRegistrationsRoute);
schedulesRouter.route('/', registerToOpenPlayRoute);
schedulesRouter.route('/', unregisterFromOpenPlayRoute);
schedulesRouter.route('/', updateOpenPlaySessionRoute);

schedulesRouter.route('/', updateScheduleSlotRoute);
schedulesRouter.route('/', deleteScheduleSlotRoute);

export { listOpenPlaySessions } from './open-play/list-open-play-sessions/handler';
export { listOpenPlayRegistrations } from './open-play/list-open-play-registrations/handler';
export type {
  ListOpenPlaySessionsInput,
  OpenPlaySessionListItem
} from './open-play/list-open-play-sessions/dto';
export type { GuestName } from './open-play/register-to-open-play/dto';
export {
  DEFAULT_MIN_PLAYERS,
  MAX_OPEN_PLAY_GUESTS
} from './shared/open-play';
export { OPEN_PLAY_STATUS_LABELS } from './shared/open-play-schema';
export type { OpenPlaySessionRow, OpenPlayStatus } from './shared/open-play-schema';

export { listScheduleSlots } from './list-schedule-slots/handler';
export { listVenues } from './list-venues/handler';
export type { ScheduleSlotView } from './list-schedule-slots/dto';
export { AUDIENCE_LABELS, WEEKDAY_LABELS } from './shared/schema';
export type { ScheduleSlotRow, VenueRow } from './shared/schema';
