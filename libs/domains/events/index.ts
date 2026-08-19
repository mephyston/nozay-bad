import { Hono } from 'hono';
import { listEventsRoute } from './list-events/route';
import { createEventRoute } from './create-event/route';
import { updateEventRoute } from './update-event/route';
import { deleteEventRoute } from './delete-event/route';
import { registerToEventRoute } from './register-to-event/route';
import { unregisterFromEventRoute } from './unregister-from-event/route';
import { listEventRegistrationsRoute } from './list-event-registrations/route';

export type Bindings = { DB: D1Database };

export const eventsRouter = new Hono<{ Bindings: Bindings }>();

eventsRouter.route('/', listEventsRoute);
eventsRouter.route('/', createEventRoute);
eventsRouter.route('/', updateEventRoute);
eventsRouter.route('/', deleteEventRoute);
eventsRouter.route('/', registerToEventRoute);
eventsRouter.route('/', unregisterFromEventRoute);
eventsRouter.route('/', listEventRegistrationsRoute);

export { listEvents } from './list-events/handler';
export { listEventRegistrations } from './list-event-registrations/handler';
export { registerToEvent } from './register-to-event/handler';
export { unregisterFromEvent } from './unregister-from-event/handler';
export {
  EVENT_CATEGORY_LABELS,
  EVENT_REGISTRATION_LABELS,
  EVENT_REGISTRATION_STATES
} from './shared/schema';
export { MAX_GUESTS } from './shared/event';
export type { ClubEventRow, ClubEventRegistrationRow, EventRegistrationState } from './shared/schema';
export type { ClubEventListItem } from './list-events/dto';
export type { EventRegistrationView, ListEventRegistrationsOutput } from './list-event-registrations/dto';
