import { Hono } from 'hono';
import { listEventsRoute } from './list-events/route';
import { createEventRoute } from './create-event/route';
import { updateEventRoute } from './update-event/route';
import { deleteEventRoute } from './delete-event/route';

export type Bindings = { DB: D1Database };

export const eventsRouter = new Hono<{ Bindings: Bindings }>();

eventsRouter.route('/', listEventsRoute);
eventsRouter.route('/', createEventRoute);
eventsRouter.route('/', updateEventRoute);
eventsRouter.route('/', deleteEventRoute);

export { listEvents } from './list-events/handler';
export { EVENT_CATEGORY_LABELS } from './shared/schema';
export type { ClubEventRow } from './shared/schema';
