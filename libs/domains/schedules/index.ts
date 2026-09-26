import { Hono } from 'hono';

import { listVenuesRoute } from './list-venues/route';
import { saveVenueRoute } from './save-venue/route';
import { listScheduleSlotsRoute } from './list-schedule-slots/route';
import { createScheduleSlotRoute } from './create-schedule-slot/route';
import { updateScheduleSlotRoute } from './update-schedule-slot/route';
import { deleteScheduleSlotRoute } from './delete-schedule-slot/route';

import { listOpenPlaySessionsRoute } from './open-play/list-open-play-sessions/route';
import { createOpenPlaySessionRoute } from './open-play/create-open-play-session/route';
import { generateOpenPlaySessionsRoute } from './open-play/generate-open-play-sessions/route';
import { updateOpenPlaySessionRoute } from './open-play/update-open-play-session/route';
import { registerToOpenPlayRoute } from './open-play/register-to-open-play/route';
import { unregisterFromOpenPlayRoute } from './open-play/unregister-from-open-play/route';
import { listOpenPlayRegistrationsRoute } from './open-play/list-open-play-registrations/route';
import { listOpenPlayAttendeesRoute } from './open-play/list-open-play-attendees/route';
import { listPublicOpenPlayRoute } from './open-play/list-public-open-play/route';
import { listOpenPlayOpenersRoute } from './open-play/list-open-play-openers/route';
import { saveOpenPlayOpenerRoute } from './open-play/save-open-play-opener/route';
import { deleteOpenPlayOpenerRoute } from './open-play/delete-open-play-opener/route';
import { claimOpenPlaySessionRoute } from './open-play/claim-open-play-session/route';
import { releaseOpenPlaySessionRoute } from './open-play/release-open-play-session/route';

import { listIndivSessionsRoute } from './indiv/list-indiv-sessions/route';
import { createIndivSessionRoute } from './indiv/create-indiv-session/route';
import { generateIndivSessionsRoute } from './indiv/generate-indiv-sessions/route';
import { updateIndivSessionRoute } from './indiv/update-indiv-session/route';
import { requestIndivRoute } from './indiv/request-indiv/route';
import { withdrawIndivRoute } from './indiv/withdraw-indiv/route';
import { listIndivCandidatesRoute } from './indiv/list-indiv-candidates/route';
import { selectIndivRoute } from './indiv/select-indiv/route';

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
// `/open-play/openers` avant `/open-play/:id` : le segment littéral serait capté.
schedulesRouter.route('/', listOpenPlayOpenersRoute);
// `/open-play/public` de même : littéral, avant tout motif `/open-play/:id`.
schedulesRouter.route('/', listPublicOpenPlayRoute);
schedulesRouter.route('/', saveOpenPlayOpenerRoute);
schedulesRouter.route('/', deleteOpenPlayOpenerRoute);
schedulesRouter.route('/', listOpenPlaySessionsRoute);
schedulesRouter.route('/', createOpenPlaySessionRoute);
// `/open-play/generate` avant `/open-play/:id` : littéral d'abord, comme partout ici.
schedulesRouter.route('/', generateOpenPlaySessionsRoute);
schedulesRouter.route('/', claimOpenPlaySessionRoute);
schedulesRouter.route('/', releaseOpenPlaySessionRoute);
schedulesRouter.route('/', listOpenPlayRegistrationsRoute);
schedulesRouter.route('/', listOpenPlayAttendeesRoute);
schedulesRouter.route('/', registerToOpenPlayRoute);
schedulesRouter.route('/', unregisterFromOpenPlayRoute);
schedulesRouter.route('/', updateOpenPlaySessionRoute);

// Séances individuelles, avant les motifs à paramètre pour la même raison que le jeu
// libre. `/indiv/generate` avant `/indiv/:id` : littéral d'abord.
schedulesRouter.route('/', listIndivSessionsRoute);
schedulesRouter.route('/', createIndivSessionRoute);
schedulesRouter.route('/', generateIndivSessionsRoute);
schedulesRouter.route('/', requestIndivRoute);
schedulesRouter.route('/', withdrawIndivRoute);
schedulesRouter.route('/', listIndivCandidatesRoute);
schedulesRouter.route('/', selectIndivRoute);
schedulesRouter.route('/', updateIndivSessionRoute);

schedulesRouter.route('/', updateScheduleSlotRoute);
schedulesRouter.route('/', deleteScheduleSlotRoute);

export { listOpenPlaySessions } from './open-play/list-open-play-sessions/handler';
export { listOpenPlayRegistrations } from './open-play/list-open-play-registrations/handler';
export { listOpenPlayOpeners } from './open-play/list-open-play-openers/handler';
export { listPublicOpenPlay } from './open-play/list-public-open-play/handler';
export type {
  ListPublicOpenPlayOutput,
  PublicOpenPlaySession
} from './open-play/list-public-open-play/dto';
export type {
  ListOpenPlaySessionsInput,
  OpenPlaySessionListItem
} from './open-play/list-open-play-sessions/dto';
export type { GuestName } from './open-play/register-to-open-play/dto';
export {
  DEFAULT_MIN_PLAYERS,
  MAX_OPEN_PLAY_GUESTS,
  publicName
} from './shared/open-play';
export { OPEN_PLAY_STATUS_LABELS } from './shared/open-play-schema';
export type { OpenPlaySessionRow, OpenPlayStatus } from './shared/open-play-schema';

export { listIndivSessions } from './indiv/list-indiv-sessions/handler';
export { listIndivCandidates } from './indiv/list-indiv-candidates/handler';
export type { IndivCandidate, ListIndivCandidatesOutput } from './indiv/list-indiv-candidates/dto';
// Sans route dans le domaine : l'annonce n'existe que composée avec les notifications,
// dans apps/api.
export { announceIndiv } from './indiv/announce-indiv/handler';
export type { AnnounceIndivOutput } from './indiv/announce-indiv/dto';
export * from './shared/indiv-selection';
export type { IndivSessionListItem, ListIndivSessionsInput, MyIndivRequest } from './indiv/list-indiv-sessions/dto';
export { INDIV_STATUS_LABELS } from './shared/indiv-schema';
export type { IndivSessionRow, IndivRequestRow, IndivStatus } from './shared/indiv-schema';
export * from './shared/indiv';

export { listScheduleSlots } from './list-schedule-slots/handler';
export { listVenues } from './list-venues/handler';
export type { ScheduleSlotView } from './list-schedule-slots/dto';
export { AUDIENCE_LABELS, WEEKDAY_LABELS } from './shared/schema';
export type { ScheduleSlotRow, VenueRow } from './shared/schema';
