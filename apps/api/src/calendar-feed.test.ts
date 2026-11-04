import { describe, it, expect, beforeEach } from 'vitest';
import { sql } from 'drizzle-orm';
import { setupMockDb } from '@nba/db/test-utils';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import { openPlayRegistrationsTable, openPlaySessionsTable, venuesTable } from '@nba/schedules/schema';
import { saveTeam, saveTeamRoster, saveChampionshipDays, publishRosters } from '@nba/teams-api';
import { teamFixturesTable, championshipDaysTable } from '@nba/teams/schema';
import { updateClubFeatures } from '@nba/club';
import { forgetIsolateFeatures } from './club-features';
import { cachedReadTtl } from './shared-read-cache';
import { app } from './index';

/**
 * Le flux d'un abonnement, par l'application entière : clé, fonctionnalité, autorisation,
 * puis la composition contre une vraie base. L'horloge des tests est au 30 août 2026.
 */
const KEY = 'secret123';
const STOREFRONT = { 'x-api-key': KEY, 'x-caller': 'storefront' };
const NOW = new Date('2026-08-30T12:00:00Z');
const SEASON = '25-26';
const LICENCE = '07104079';
const CHILD = '07104080';

// Une empreinte par test : le flux est réellement mis en cache une heure, et le cache
// survit d'un test à l'autre.
let counter = 0;
const nextHash = () => (++counter).toString(16).padStart(64, 'a');
let HASH: string;
let CHILD_HASH: string;

let mockD1: any;
let db: any;
let env: Record<string, unknown>;
let registeredSession: number;
let otherSession: number;

const get = (path: string) => app.request(path, { headers: STOREFRONT }, env);
const subscribe = (licence: string, tokenHash: string) =>
  app.request(
    '/members/calendar-feed',
    { method: 'PUT', headers: { ...STOREFRONT, 'Content-Type': 'application/json' }, body: JSON.stringify({ licence, tokenHash }) },
    env
  );
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

beforeEach(async () => {
  ({ mockD1, db } = await setupMockDb());
  forgetIsolateFeatures();
  env = { DB: mockD1, INTERNAL_API_KEY: KEY };

  await db.run(sql`INSERT OR IGNORE INTO seasons (id, code, name, start_date, end_date, active, created_at)
    VALUES (1, ${SEASON}, 'Saison', '2025-09-01', '2026-08-31', 1, 0)`);
  for (const [id, licence, firstName] of [[1, LICENCE, 'Camille'], [2, CHILD, 'Léo']] as const) {
    await insertMemberFixture(db, {
      id, licence, seasonId: 1, lastName: 'DUPONT', firstName, gender: 'M', birthDate: '1990-01-01',
      status: 'valide', type: 'Adulte', amountDueCents: 0, amountReceivedCents: 0, amountRemainingCents: 0
    });
  }

  await db.run(sql`INSERT INTO club_events (slug, title, starts_at, ends_at, category, venue_label, status, registration, created_at, updated_at) VALUES
    ('soiree', 'Soirée du club', '2026-11-14T19:00', '2026-11-14T23:00', 'vie_du_club', 'Gymnase', 'published', 'open', 0, 0),
    ('secret', 'Brouillon secret', '2026-11-20T19:00', NULL, 'vie_du_club', NULL, 'draft', 'none', 0, 0)`);

  const [venue] = await db.insert(venuesTable).values({ code: 'jean-moulin', name: 'Gymnase Jean Moulin', city: 'Ville', createdAt: NOW }).returning();
  const session = (date: string) => ({ seasonCode: SEASON, venueId: venue.id, date, startTime: '14:00', endTime: '17:00', minPlayers: 4, createdAt: NOW, updatedAt: NOW });
  const sessions = await db.insert(openPlaySessionsTable).values([session('2026-11-07'), session('2026-11-08')]).returning();
  registeredSession = sessions[0].id;
  otherSession = sessions[1].id;
  await db.insert(openPlayRegistrationsTable).values({
    sessionId: registeredSession, memberId: 2, licence: CHILD, firstName: 'Léo', lastName: 'DUPONT', email: 'l@example.org', createdAt: NOW, updatedAt: NOW
  });

  await publishRosters(db, { seasonCode: SEASON, championship: 'icd_mixte', published: true }, NOW);
  const team = await saveTeam(db, { seasonCode: SEASON, championship: 'icd_mixte', division: 'D2', number: 2 }, NOW);
  await saveTeamRoster(db, { teamId: team.id, licences: [LICENCE] }, NOW);
  await saveChampionshipDays(db, {
    seasonCode: SEASON,
    championship: 'icd_mixte',
    days: [{ number: 1, weekStart: '2026-11-02' }, { number: 2, weekStart: '2026-11-16' }]
  }, NOW);
  // La journée 1 a sa date, la journée 2 n'a que sa semaine.
  const [day1] = await db.select().from(championshipDaysTable).all();
  await db.insert(teamFixturesTable).values({ teamId: team.id, dayId: day1.id, playedAt: '2026-11-05T20:30', opponent: 'Voisins', createdAt: NOW });

  HASH = nextHash();
  CHILD_HASH = nextHash();
  await subscribe(LICENCE, HASH);
  await subscribe(CHILD, CHILD_HASH);
});

describe('flux d’un abonnement', () => {
  it('répond un calendrier au nom du profil, à l’heure du club', async () => {
    const res = await get(`/calendar-feed/${HASH}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/calendar');

    const ics = unfold(await res.text());
    expect(ics).toMatch(/X-WR-CALNAME:.* – Camille/);
    expect(ics).toContain('SUMMARY:Soirée du club');
    // 19 h à Paris en novembre : 18 h UTC.
    expect(ics).toContain('DTSTART:20261114T180000Z');
  });

  it('ne publie ni brouillon ni rencontre sans date', async () => {
    const ics = unfold(await (await get(`/calendar-feed/${HASH}`)).text());
    expect(ics).not.toContain('Brouillon secret');
    expect(ics).toContain('J1 contre Voisins');
    expect(ics).toContain('DTSTART:20261105T193000Z');
    expect(ics).not.toContain('· J2');
  });

  it('un flux par profil : le jeu libre ne suit que l’inscription de ce profil', async () => {
    const parent = unfold(await (await get(`/calendar-feed/${HASH}`)).text());
    const child = unfold(await (await get(`/calendar-feed/${CHILD_HASH}`)).text());

    expect(parent).not.toContain('SUMMARY:Jeu libre');
    expect(child.match(/SUMMARY:Jeu libre/g)).toHaveLength(1);
    expect(child).toContain(`UID:open-play-${registeredSession}@`);
    expect(child).not.toContain(`UID:open-play-${otherSession}@`);
    // Les rendez-vous du club figurent dans les deux, les rencontres de l'équipe chez qui joue.
    expect(child).toContain('SUMMARY:Soirée du club');
    expect(child).not.toContain('Voisins');
  });

  it('ne laisse sortir ni licence, ni adresse, ni nom de famille', async () => {
    const ics = await (await get(`/calendar-feed/${CHILD_HASH}`)).text();
    for (const secret of [CHILD, 'l@example.org', 'DUPONT']) expect(ics).not.toContain(secret);
  });

  it('annonce l’annulation d’une séance où le profil est inscrit', async () => {
    await db.update(openPlaySessionsTable).set({ status: 'cancelled', cancelledReason: 'Gymnase fermé' });
    const ics = unfold(await (await get(`/calendar-feed/${CHILD_HASH}`)).text());
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('DESCRIPTION:Gymnase fermé');
  });

  it('ne coupe pas le flux à la longueur par défaut de la liste', async () => {
    for (let i = 0; i < 55; i++) {
      await db.run(sql`INSERT INTO club_events (slug, title, starts_at, category, status, registration, created_at, updated_at)
        VALUES (${`lot-${i}`}, ${`Lot ${i}`}, '2026-12-01T10:00', 'stage', 'published', 'none', 0, 0)`);
    }
    const ics = await (await get(`/calendar-feed/${HASH}`)).text();
    expect(ics.match(/SUMMARY:Lot /g)).toHaveLength(55);
  });

  it('ne laisse pas une adresse saisie injecter des lignes dans le fichier', async () => {
    await db.run(sql`UPDATE club_events SET external_url = ${'https://a.example\r\nATTENDEE:x'} WHERE slug = 'soiree'`);
    expect(await (await get(`/calendar-feed/${HASH}`)).text()).not.toContain('ATTENDEE');

    await db.run(sql`UPDATE club_events SET external_url = 'https://ffbad.example/fiche' WHERE slug = 'soiree'`);
    expect(await (await get(`/calendar-feed/${CHILD_HASH}`)).text()).toContain('URL:https://ffbad.example/fiche');
  });

  it('une adresse inconnue ou mal formée ne répond rien', async () => {
    expect((await get(`/calendar-feed/${'c'.repeat(64)}`)).status).toBe(404);
    expect((await get('/calendar-feed/pas-une-empreinte')).status).toBe(404);
  });

  it('sans adhésion, le flux reste valide et vide', async () => {
    await db.run(sql`DELETE FROM memberships WHERE id = 1`);
    const res = await get(`/calendar-feed/${HASH}`);
    expect(res.status).toBe(200);
    const ics = await res.text();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('exige la clé interne', async () => {
    expect((await app.request(`/calendar-feed/${HASH}`, {}, env)).status).toBe(401);
  });

  it('se tait quand le club éteint la fonctionnalité', async () => {
    await updateClubFeatures(db, { calendar_feed: false }, 'bureau@example.org');
    forgetIsolateFeatures();
    expect((await get(`/calendar-feed/${HASH}`)).status).toBe(404);
    expect((await get(`/members/calendar-feed?licence=${LICENCE}`)).status).toBe(404);
  });

  it('retire une rubrique éteinte, sans toucher au reste', async () => {
    await updateClubFeatures(db, { open_play: false }, 'bureau@example.org');
    forgetIsolateFeatures();
    const ics = unfold(await (await get(`/calendar-feed/${CHILD_HASH}`)).text());
    expect(ics).not.toContain('SUMMARY:Jeu libre');
    expect(ics).toContain('SUMMARY:Soirée du club');
  });

  it('ressert le flux depuis le cache : une relecture ne coûte rien en base', async () => {
    const first = await get(`/calendar-feed/${HASH}`);
    expect(first.headers.get('x-shared-read-cache')).toBeNull();
    await first.text();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = await get(`/calendar-feed/${HASH}`);
    expect(second.headers.get('x-shared-read-cache')).toBe('hit');
    expect(second.headers.get('content-type')).toContain('text/calendar');
  });

  it('met le flux en cache une heure, jamais le reste', () => {
    expect(cachedReadTtl('GET', `/calendar-feed/${HASH}`)).toBe(3600);
    expect(cachedReadTtl('GET', '/calendar-feed/item')).toBeUndefined();
    expect(cachedReadTtl('GET', '/members/calendar-feed')).toBeUndefined();
  });
});

describe('ajout d’un seul rendez-vous', () => {
  const item = (query: string) => get(`/calendar-feed/item?licence=${LICENCE}&${query}`);

  it('rend le fichier et le lien Google d’un événement', async () => {
    const [row] = (await db.all(sql`SELECT id FROM club_events WHERE slug = 'soiree'`)) as Array<{ id: number }>;
    const { data } = (await (await item(`kind=event&ref=${row.id}`)).json()) as any;

    expect(data.ics).toContain('DTSTART:20261114T180000Z');
    expect(data.ics).not.toContain('X-WR-CALNAME');
    expect(new URL(data.googleUrl).searchParams.get('dates')).toBe('20261114T180000Z/20261114T220000Z');
  });

  it('propose une séance où le profil n’est pas inscrit', async () => {
    const { data } = (await (await item(`kind=open-play&ref=${otherSession}`)).json()) as any;
    expect(data.ics).toContain('SUMMARY:Jeu libre');
    expect(data.ics).toContain('LOCATION:Gymnase Jean Moulin\\, Ville');
  });

  it('refuse un brouillon et une rencontre sans date', async () => {
    const [draft] = (await db.all(sql`SELECT id FROM club_events WHERE slug = 'secret'`)) as Array<{ id: number }>;
    const [team] = (await db.all(sql`SELECT id FROM club_teams`)) as Array<{ id: number }>;
    expect((await item(`kind=event&ref=${draft.id}`)).status).toBe(404);
    expect((await item(`kind=fixture&ref=${team.id}-2`)).status).toBe(404);
    expect((await item(`kind=fixture&ref=${team.id}-1`)).status).toBe(200);
  });

  it('valide sa requête', async () => {
    expect((await item('kind=autre&ref=1')).status).toBe(400);
    expect((await item("kind=event&ref=1';--")).status).toBe(400);
  });
});
