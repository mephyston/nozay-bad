import { Hono } from 'hono';
import { Type } from '@sinclair/typebox';
import { tbValidator } from '@hono/typebox-validator';
import { createDb, type Db } from '@nba/db';
import { getClubSettings, localDate } from '@nba/club/settings';
import { listEvents, type ClubEventListItem } from '@nba/events-api';
import { listOpenPlaySessions, type OpenPlaySessionListItem } from '@nba/schedules-api';
import { getSeasonAtDate } from '@nba/accounting-api';
import { listClubFixtures, listMyFixtures, type ClubFixture, type MyFixture } from '@nba/teams-api';
import { resolveCalendarProfileByLicence, resolveCalendarProfileByToken, type CalendarProfile } from '@nba/members-api';
import { isolateFeatures, type ClubFeatureBindings } from './club-features';
import { googleCalendarUrl, isValidLocalDate, renderCalendar, type CalendarItem } from './calendar-ics';

/**
 * L'agenda d'un adhérent, pour son calendrier personnel.
 *
 * Vit dans l'app et non dans un domaine : il compose les événements, le jeu libre, les
 * interclubs et les adhérents, dont aucun ne peut importer les autres.
 *
 * **Une lecture qui échoue fait échouer le flux.** Les listes lèvent et l'API répond 500 :
 * un flux amputé ferait disparaître des rendez-vous de l'agenda de l'adhérent, alors
 * qu'une erreur lui laisse la dernière version reçue.
 */
export type CalendarFeedBindings = ClubFeatureBindings;

export const calendarFeedRouter = new Hono<{ Bindings: CalendarFeedBindings }>();

/** Au-delà de ce que l'agenda d'un club peut compter : le défaut de la liste amputerait le flux. */
const ALL_UPCOMING_EVENTS = 500;

/** Saisie libre du bureau : seule une adresse web, sur une seule ligne, sort dans un fichier d'agenda. */
const webUrl = (value: string | null) => (value && /^https?:\/\/\S+$/i.test(value) ? value : null);

const uidDomain = (clubName: string) =>
  clubName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'club';

function eventItem(event: ClubEventListItem, domain: string): CalendarItem {
  return {
    uid: `event-${event.id}@${domain}`,
    title: event.title,
    start: event.startsAt,
    end: event.endsAt,
    // Minuit n'est pas un horaire : l'espace adhérent le lit déjà comme une journée.
    allDay: event.allDay || event.startsAt.slice(11, 16) === '00:00',
    location: event.venueLabel,
    description: null,
    url: webUrl(event.externalUrl),
    cancelled: false
  };
}

function openPlayItem(session: OpenPlaySessionListItem, domain: string): CalendarItem {
  const venue = session.venue;
  return {
    uid: `open-play-${session.id}@${domain}`,
    title: session.label ?? 'Jeu libre',
    start: `${session.date}T${session.startTime}`,
    end: `${session.date}T${session.endTime}`,
    allDay: false,
    location: venue ? [venue.name, venue.streetAddress, venue.city].filter(Boolean).join(', ') : null,
    description: session.status === 'cancelled' ? session.cancelledReason : null,
    url: null,
    cancelled: session.status === 'cancelled'
  };
}

/** Une rencontre à la date encore inconnue n'en donne pas : elle n'a rien à faire dans un agenda. */
function fixtureItem(fixture: MyFixture, domain: string): CalendarItem | null {
  if (!fixture.date) return null;
  const against = fixture.opponent ? ` contre ${fixture.opponent}` : '';
  // Sans accord de genre : la phrase vise un profil dont le genre n'a pas à être supposé.
  const lineup = fixture.selected
    ? `Sur la feuille de match${fixture.slotLabel ? ` : ${fixture.slotLabel}` : ''}`
    : fixture.lineupExists
      ? 'Pas sur la feuille de match de cette journée'
      : 'Composition pas encore publiée';
  return {
    uid: `fixture-${fixture.teamId}-${fixture.dayNumber}@${domain}`,
    title: `${fixture.teamName} · ${fixture.dayLabel ?? `J${fixture.dayNumber}`}${against}`,
    start: fixture.date,
    end: null,
    allDay: fixture.date.length <= 10,
    location: fixture.venue,
    description: `${fixture.championshipLabel} · ${fixture.divisionLabel}\n${lineup}`,
    url: null,
    cancelled: false
  };
}

/**
 * Ce que contient l'abonnement : les rendez-vous du club, les rencontres de l'adhérent, et
 * seulement les séances de jeu libre où il s'est inscrit — une par semaine toute la saison
 * noierait son agenda.
 */
async function feedItems(db: Db, env: CalendarFeedBindings, profile: CalendarProfile, domain: string, now: Date) {
  if (!profile.membership) return [];
  const { memberId, seasonCode } = profile.membership;
  const features = await isolateFeatures(env);

  const [events, openPlay, fixtures] = await Promise.all([
    features.events ? listEvents(db, { limit: ALL_UPCOMING_EVENTS }, now) : [],
    features.open_play ? listOpenPlaySessions(db, { memberId }, now) : { sessions: [] },
    features.teams ? listMyFixtures(db, { licence: profile.licence, seasonCode }, now) : { fixtures: [] }
  ]);

  return [
    ...events.map((event) => eventItem(event, domain)),
    ...openPlay.sessions.filter((session) => session.myGuests !== null).map((session) => openPlayItem(session, domain)),
    ...fixtures.fixtures.flatMap((fixture) => fixtureItem(fixture, domain) ?? [])
  ].filter((item) => isValidLocalDate(item.start));
}

/** Un seul rendez-vous de l'agenda, inscrit ou non : c'est l'adhérent qui le choisit. */
async function singleItem(
  db: Db,
  env: CalendarFeedBindings,
  profile: CalendarProfile,
  domain: string,
  now: Date,
  kind: 'event' | 'open-play' | 'fixture',
  ref: string
): Promise<CalendarItem | null> {
  const features = await isolateFeatures(env);
  let item: CalendarItem | null = null;

  if (kind === 'event' && features.events) {
    const found = (await listEvents(db, { limit: ALL_UPCOMING_EVENTS }, now)).find((event) => event.id === Number(ref));
    item = found ? eventItem(found, domain) : null;
  }
  if (kind === 'open-play' && features.open_play) {
    const { sessions } = await listOpenPlaySessions(db, { sessionIds: [Number(ref)], includeCancelled: false }, now);
    item = sessions[0] ? openPlayItem(sessions[0], domain) : null;
  }
  if (kind === 'fixture' && features.teams && profile.membership) {
    const [teamId, dayNumber] = ref.split('-').map(Number);
    const { fixtures } = await listMyFixtures(db, { licence: profile.licence, seasonCode: profile.membership.seasonCode }, now);
    const found = fixtures.find((f) => f.teamId === teamId && f.dayNumber === dayNumber);
    item = found ? fixtureItem(found, domain) : null;
  }
  return item && isValidLocalDate(item.start) ? item : null;
}

const NOT_FOUND = { success: false, error: 'Ressource introuvable' };

const itemQuerySchema = Type.Object({
  licence: Type.String({ minLength: 1, maxLength: 20 }),
  kind: Type.Union([Type.Literal('event'), Type.Literal('open-play'), Type.Literal('fixture')]),
  // « 12 » pour un événement ou une séance, « équipe-journée » pour une rencontre.
  ref: Type.String({ pattern: '^[0-9]{1,9}(-[0-9]{1,9})?$' })
});

// Littérale : avant `/:hash`.
calendarFeedRouter.get(
  '/item',
  tbValidator('query', itemQuerySchema, (result, c) => {
    if (!result.success) return c.json({ success: false, error: 'Rendez-vous invalide' }, 400);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const { licence, kind, ref } = c.req.valid('query');
    const db = createDb(c.env.DB);
    const now = new Date();
    const { name, timezone } = await getClubSettings(db);

    // Un adhérent connecté a forcément une personne ; la licence vient de sa session.
    const profile = await resolveCalendarProfileByLicence(db, licence, localDate(now, timezone));
    if (!profile) return c.json(NOT_FOUND, 404);

    const item = await singleItem(db, c.env, profile, uidDomain(name), now, kind, ref);
    if (!item) return c.json(NOT_FOUND, 404);

    return c.json({
      success: true,
      data: {
        ics: renderCalendar({ timeZone: timezone, items: [item], now }),
        googleUrl: googleCalendarUrl(item, timezone)
      }
    });
  }
);

/**
 * Toutes les rencontres du club, pour qui veut suivre les autres équipes.
 *
 * Une adresse unique et sans jeton : elle ne dit que ce que l'espace adhérent montre à tout
 * adhérent — quand, où, contre qui —, jamais une composition ni un nom. Seules les rencontres
 * datées : une semaine sans jour n'a rien de juste à inscrire dans un agenda.
 */
function clubFixtureItem(fixture: ClubFixture, domain: string): CalendarItem | null {
  if (!fixture.date) return null;
  const against = fixture.opponent ? ` contre ${fixture.opponent}` : '';
  return {
    uid: `club-fixture-${fixture.teamId}-${fixture.dayNumber}@${domain}`,
    title: `${fixture.teamName} · ${fixture.dayLabel ?? `J${fixture.dayNumber}`}${against}`,
    start: fixture.date,
    end: null,
    allDay: fixture.date.length <= 10,
    location: fixture.venue,
    description: `${fixture.championshipLabel} · ${fixture.divisionLabel}`,
    url: null,
    cancelled: false
  };
}

// Littérale : avant `/:hash`.
calendarFeedRouter.get('/club-fixtures', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
  const db = createDb(c.env.DB);
  const now = new Date();
  const { name, timezone } = await getClubSettings(db);
  const features = await isolateFeatures(c.env);
  const season = features.teams ? await getSeasonAtDate(db, localDate(now, timezone)) : null;
  const { fixtures } = season ? await listClubFixtures(db, { seasonCode: season.code }, now) : { fixtures: [] };
  const domain = uidDomain(name);
  const items = fixtures.flatMap((fixture) => clubFixtureItem(fixture, domain) ?? []).filter((item) => isValidLocalDate(item.start));
  const body = renderCalendar({ name: `${name} – rencontres du club`, timeZone: timezone, items, now });
  return c.body(body, 200, { 'Content-Type': 'text/calendar; charset=utf-8' });
});

calendarFeedRouter.get(
  '/:hash',
  tbValidator('param', Type.Object({ hash: Type.String({ pattern: '^[0-9a-f]{64}$' }) }), (result, c) => {
    if (!result.success) return c.json(NOT_FOUND, 404);
  }),
  async (c) => {
    if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);
    const db = createDb(c.env.DB);
    const now = new Date();
    const { name, timezone } = await getClubSettings(db);

    const profile = await resolveCalendarProfileByToken(db, c.req.valid('param').hash, localDate(now, timezone));
    if (!profile) return c.json(NOT_FOUND, 404);

    const items = await feedItems(db, c.env, profile, uidDomain(name), now);
    const body = renderCalendar({ name: `${name} – ${profile.firstName}`, timeZone: timezone, items, now });
    return c.body(body, 200, { 'Content-Type': 'text/calendar; charset=utf-8' });
  }
);
